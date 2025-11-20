import { calculateDateRange } from "@crons/execution/date-calculator.js";
import { completeRun, createRun, failRun } from "@crons/execution/run-tracker.js";
import { acquireAdvisoryLock, acquireGlobalOrchestratorLock, releaseAdvisoryLock, releaseGlobalOrchestratorLock } from "@crons/orchestrator/advisory-locks.js";
import type { DataSourceScript } from "@crons/orchestrator/script-loader.js";
import { buildEnvironment, getEnabledScripts, loadAllImportScripts } from "@crons/orchestrator/script-loader.js";
import type { DataSource, DataSourceConfig, PrismaClient } from "@prisma/client";
import { PGraph } from "p-graph/lib/PGraph.js";
import { db } from "~/db.server.js";

async function executeScriptWithLock(database: PrismaClient, dataSource: DataSource & { configs: DataSourceConfig[] }, script: DataSourceScript): Promise<void> {
  // Try to acquire resource lock
  const lockAcquired = await acquireAdvisoryLock(database, dataSource.id, script.resource);

  if (!lockAcquired) {
    console.log(`Could not acquire lock for ${dataSource.provider}:${script.resource}, skipping`);
    return;
  }

  try {
    // Create run record
    const runId = await createRun(database, dataSource.id, script.resource);

    // Calculate date range for incremental sync
    const { startDate, endDate } = await calculateDateRange(database, dataSource.id, script.resource, script.importWindowDays);

    // Build environment from configs
    const env = buildEnvironment(dataSource.configs);

    // Execute script
    try {
      await script.run({
        dataSourceId: dataSource.id,
        dataSourceName: dataSource.provider,
        env,
        db: database,
        startDate,
        endDate,
        runId,
      });

      // Mark run as completed (recordsImported is updated by the script itself)
      await completeRun(database, runId, 0, endDate);
    } catch (error) {
      // Mark run as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await failRun(database, runId, errorMessage);
      console.error(`Script ${dataSource.provider}:${script.resource} failed: ${errorMessage}`);
    }
  } finally {
    // Release resource lock
    await releaseAdvisoryLock(database, dataSource.id, script.resource);
  }
}

export async function runOrchestrator(): Promise<void> {
  // 0. Acquire global orchestrator lock (system-wide)
  const globalLock = await acquireGlobalOrchestratorLock(db);

  if (!globalLock) {
    console.log("Another orchestrator is running, exiting");
    return;
  }

  try {
    // 1. Load all import scripts (scan data-sources/ directory)
    const allScripts = await loadAllImportScripts();

    // 2. Get enabled scripts and their data sources
    const { scripts: enabledScripts, dataSourceMap } = await getEnabledScripts(db, allScripts);

    if (enabledScripts.length === 0) {
      console.log("No enabled scripts to run");
      return;
    }

    // 3. Build p-graph with all enabled scripts
    const nodeMap = new Map<string, { run: () => Promise<void> }>();
    const dependencies: [string, string][] = [];

    for (const script of enabledScripts) {
      const dataSource = dataSourceMap.get(script);
      if (!dataSource) {
        continue;
      }

      // Add node to the graph
      const nodeId = `${dataSource.id}:${script.resource}`;
      nodeMap.set(nodeId, {
        run: async () => executeScriptWithLock(db, dataSource, script),
      });

      // Add dependencies
      for (const dep of script.dependsOn) {
        const depNodeId = `${dataSource.id}:${dep}`;
        dependencies.push([depNodeId, nodeId]);
      }
    }

    const graph = new PGraph(nodeMap, dependencies);

    // 4. Execute with dependency resolution and parallelization
    await graph.run();

    // 5. Update lastSyncAt for all data sources
    const uniqueDataSources = new Set(dataSourceMap.values());
    for (const dataSource of uniqueDataSources) {
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { lastSyncAt: new Date() },
      });
    }

    console.log("Orchestrator completed successfully");
  } finally {
    // 6. Release global lock
    await releaseGlobalOrchestratorLock(db);
  }
}
