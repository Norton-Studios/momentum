import type { DbClient, ImportBatch } from "../db.ts";
import { acquireGlobalOrchestratorLock, releaseGlobalOrchestratorLock } from "../execution/advisory-locks.js";
import { buildExecutionGraph } from "../execution/execution-graph.js";
import { type DataSourceScriptMap, getEnabledScripts } from "./script-loader.js";

export async function runOrchestrator(db: DbClient, options: OrchestratorOptions = {}): Promise<OrchestratorResult> {
  // Transaction ensures lock acquire/release use the same connection
  // Data operations use regular db client so they commit immediately (visible for progress)
  return db.$transaction(
    async (tx) => {
      const startTime = Date.now();
      const errors: Array<ScriptError> = [];
      const executionResults = new Map<string, ScriptExecutionResult>();
      const globalLock = await acquireGlobalOrchestratorLock(tx);

      if (!globalLock) {
        console.log("[orchestrator] Another orchestrator is running, exiting");
        return createResult(startTime, new Map(), [], undefined);
      }

      try {
        const scriptsWithDataSources = await getEnabledScripts(db);
        const batch = await createBatch(db, options.triggeredBy, scriptsWithDataSources.size);

        if (scriptsWithDataSources.size === 0 || !batch) {
          return createResult(startTime, new Map(), [], undefined);
        }

        const graph = buildExecutionGraph(db, scriptsWithDataSources, executionResults, errors, batch.id);

        await graph.run();
        await updateDataSourceSyncTimes(db, scriptsWithDataSources);
        await finalizeBatch(db, batch.id, startTime, executionResults);

        return createResult(startTime, executionResults, errors, batch.id);
      } catch (_error) {
        return createResult(startTime, executionResults, errors, undefined);
      } finally {
        console.log("[orchestrator] Releasing global lock");
        await releaseGlobalOrchestratorLock(tx);
      }
    },
    { timeout: 30 * 60 * 1000 }
  );
}

async function createBatch(db: DbClient, triggeredBy: string | undefined, totalScripts: number): Promise<ImportBatch> {
  return db.importBatch.create({
    data: {
      status: "RUNNING",
      triggeredBy: triggeredBy ?? "scheduler",
      totalScripts,
    },
  });
}

async function finalizeBatch(db: DbClient, batchId: string, startTime: number, executionResults: Map<string, ScriptExecutionResult>): Promise<void> {
  const results = Array.from(executionResults.values());
  const completedScripts = results.filter((r) => r.success).length;
  const failedScripts = results.filter((r) => !r.success && !r.skipped).length;
  const hasFailures = failedScripts > 0;

  await db.importBatch.update({
    where: { id: batchId },
    data: {
      status: hasFailures ? "FAILED" : "COMPLETED",
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
      completedScripts,
      failedScripts,
    },
  });
}

async function updateDataSourceSyncTimes(db: DbClient, dataSources: DataSourceScriptMap): Promise<void> {
  const dataSourcesArray = Array.from(dataSources.values());

  await Promise.all(
    dataSourcesArray.map((dataSource) =>
      db.dataSource.update({
        where: { id: dataSource.id },
        data: { lastSyncAt: new Date() },
      })
    )
  );
}

function createResult(
  startTime: number,
  executionResults: Map<string, ScriptExecutionResult>,
  errors: Array<{ script: string; error: string }>,
  batchId: string | undefined
): OrchestratorResult {
  const results = Array.from(executionResults.values());
  return {
    batchId,
    scriptsExecuted: results.filter((r) => r.success).length,
    scriptsFailed: results.filter((r) => !r.success && !r.skipped).length,
    scriptsSkipped: results.filter((r) => r.skipped).length,
    executionTimeMs: Date.now() - startTime,
    errors,
  };
}

export type ScriptError = { script: string; error: string };

export interface OrchestratorOptions {
  triggeredBy?: string;
}

export interface OrchestratorResult {
  batchId?: string;
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
