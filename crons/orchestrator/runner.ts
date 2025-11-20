import type { DataSource, DataSourceConfig, PrismaClient } from "@prisma/client";
import { PGraph } from "p-graph/lib/PGraph.js";
import { calculateDateRange } from "../execution/date-calculator.js";
import { completeRun, createRun, failRun } from "../execution/run-tracker.js";
import { acquireAdvisoryLock, acquireGlobalOrchestratorLock, releaseAdvisoryLock, releaseGlobalOrchestratorLock } from "./advisory-locks.js";
import type { DataSourceScript } from "./script-loader.js";
import { buildEnvironment, getEnabledScripts, loadAllImportScripts } from "./script-loader.js";

export async function runOrchestrator(db: PrismaClient): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const errors: Array<ScriptError> = [];
  const executionResults = new Map<string, ScriptExecutionResult>();

  const globalLock = await acquireGlobalOrchestratorLock(db);

  if (!globalLock) {
    console.log("Another orchestrator is running, exiting");
    return createResult(startTime, executionResults, errors);
  }

  try {
    const allScripts = await loadAllImportScripts();
    const { scripts: enabledScripts, dataSourceMap } = await getEnabledScripts(db, allScripts);

    if (enabledScripts.length === 0) {
      console.log("No enabled scripts to run");
      return createResult(startTime, executionResults, errors);
    }

    const { nodeMap, dependencies } = buildExecutionGraph(enabledScripts, dataSourceMap, db, executionResults, errors);
    const graph = new PGraph(nodeMap, dependencies);

    await graph.run();

    await updateDataSourceSyncTimes(Array.from(new Set(dataSourceMap.values())), db);

    console.log("Orchestrator completed successfully");
    return createResult(startTime, executionResults, errors);
  } finally {
    await releaseGlobalOrchestratorLock(db);
  }
}

function buildNodeId(dataSourceId: string, resource: string): string {
  return `${dataSourceId}:${resource}`;
}

function buildExecutionGraph(
  enabledScripts: DataSourceScript[],
  dataSourceMap: Map<DataSourceScript, DataSourceWithConfig>,
  db: PrismaClient,
  executionResults: Map<string, ScriptExecutionResult>,
  errors: Array<ScriptError>
): ScriptGraph {
  const nodeMap = new Map<string, { run: () => Promise<void> }>();
  const dependencies: [string, string][] = [];

  for (const script of enabledScripts) {
    const dataSource = dataSourceMap.get(script);
    if (!dataSource) {
      continue;
    }

    const nodeId = buildNodeId(dataSource.id, script.resource);
    nodeMap.set(nodeId, {
      run: async () => {
        const result = await executeScriptWithLock(db, dataSource, script);
        executionResults.set(nodeId, result);
        if (!result.success && result.error) {
          errors.push({ script: `${dataSource.provider}:${script.resource}`, error: result.error });
        }
      },
    });

    for (const dep of script.dependsOn) {
      const depNodeId = buildNodeId(dataSource.id, dep);
      dependencies.push([depNodeId, nodeId]);
    }
  }

  return { nodeMap, dependencies };
}

async function updateDataSourceSyncTimes(dataSources: Array<DataSourceWithConfig>, db: PrismaClient): Promise<void> {
  await Promise.all(
    dataSources.map((dataSource) =>
      db.dataSource.update({
        where: { id: dataSource.id },
        data: { lastSyncAt: new Date() },
      })
    )
  );
}

function createResult(startTime: number, executionResults: Map<string, ScriptExecutionResult>, errors: Array<{ script: string; error: string }>): OrchestratorResult {
  const results = Array.from(executionResults.values());
  return {
    scriptsExecuted: results.filter((r) => r.success).length,
    scriptsFailed: results.filter((r) => !r.success && !r.skipped).length,
    scriptsSkipped: results.filter((r) => r.skipped).length,
    executionTimeMs: Date.now() - startTime,
    errors,
  };
}

async function executeScriptWithLock(database: PrismaClient, dataSource: DataSource & { configs: DataSourceConfig[] }, script: DataSourceScript): Promise<ScriptExecutionResult> {
  const lockAcquired = await acquireAdvisoryLock(database, dataSource.id, script.resource);

  if (!lockAcquired) {
    console.log(`Could not acquire lock for ${dataSource.provider}:${script.resource}, skipping`);
    return { success: false, skipped: true };
  }

  try {
    const runId = await createRun(database, dataSource.id, script.resource);
    const { startDate, endDate } = await calculateDateRange(database, dataSource.id, script.resource, script.importWindowDays);
    const env = buildEnvironment(dataSource.configs);

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

      await completeRun(database, runId, 0, endDate);
      return { success: true, skipped: false };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await failRun(database, runId, errorMessage);
      console.error(`Script ${dataSource.provider}:${script.resource} failed: ${errorMessage}`);
      return { success: false, skipped: false, error: errorMessage };
    }
  } finally {
    await releaseAdvisoryLock(database, dataSource.id, script.resource);
  }
}

type ScriptError = { script: string; error: string };
type DataSourceWithConfig = DataSource & { configs: DataSourceConfig[] };
type ScriptGraph = {
  nodeMap: Map<string, { run: () => Promise<void> }>;
  dependencies: [string, string][];
};

export interface OrchestratorResult {
  scriptsExecuted: number;
  scriptsFailed: number;
  scriptsSkipped: number;
  executionTimeMs: number;
  errors: Array<{ script: string; error: string }>;
}

export interface ScriptExecutionResult {
  success: boolean;
  skipped: boolean;
  error?: string;
}
