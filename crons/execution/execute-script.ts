import type { PrismaClient } from "@prisma/client";
import { acquireAdvisoryLock, releaseAdvisoryLock } from "./advisory-locks.js";
import { calculateDateRange } from "../execution/date-calculator.js";
import { completeRun, createRun, failRun } from "../execution/run-tracker.js";
import type { DataSourceScript, ExecutionContext } from "../orchestrator/script-loader.js";
import type { ScriptExecutionResult } from "../orchestrator/runner.js";

export async function executeScript(
  db: PrismaClient,
  executionContext: ExecutionContext,
  script: DataSourceScript,
  batchId: string
): Promise<ScriptExecutionResult> {
  const dataSourceKey = `${executionContext.dataSourceName}:${script.resource}`;
  const lockAcquired = await acquireAdvisoryLock(db, dataSourceKey);
  const runId = await createRun(db, executionContext.dataSourceId, script.resource, batchId);

  if (!lockAcquired || !runId) {
    console.log(`Could not acquire lock for ${dataSourceKey}, skipping`);
    return { success: false, skipped: true };
  }

  try {
    const { startDate, endDate } = await calculateDateRange(db, executionContext.dataSourceId, script.resource, script.importWindowDays);

    await script.run(db, { ...executionContext, startDate, endDate, runId });
    await completeRun(db, runId, 0, endDate);

    return { success: true, skipped: false };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await failRun(db, runId, errorMessage);
    console.error(`Script ${dataSourceKey} failed: ${errorMessage}`);

    return { success: false, skipped: false, error: errorMessage };
  } finally {
    await releaseAdvisoryLock(db, dataSourceKey);
  }
}
