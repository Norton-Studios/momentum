import type { PrismaClient } from "@prisma/client";
import { calculateDateRanges } from "../execution/date-calculator.js";
import { completeRun, createRun, failRun } from "../execution/run-tracker.js";
import type { ScriptExecutionResult } from "../orchestrator/runner.js";
import type { DataSourceScript, ExecutionContext } from "../orchestrator/script-loader.js";
import { acquireAdvisoryLock, releaseAdvisoryLock } from "./advisory-locks.js";

export async function executeScript(db: PrismaClient, executionContext: ExecutionContext, script: DataSourceScript, batchId: string): Promise<ScriptExecutionResult> {
  return db.$transaction(
    async (tx) => {
      const dataSourceKey = `${executionContext.provider}:${script.resource}`;
      const lockAcquired = await acquireAdvisoryLock(tx, dataSourceKey);

      if (!lockAcquired) {
        console.log(`Could not acquire lock for ${dataSourceKey}, skipping`);
        return { success: false, skipped: true };
      }

      try {
        return await execute(db, executionContext, script, batchId);
      } finally {
        await releaseAdvisoryLock(tx, dataSourceKey);
      }
    },
    { timeout: 15 * 60 * 1000 }
  );
}

async function execute(db: PrismaClient, executionContext: ExecutionContext, script: DataSourceScript, batchId: string): Promise<ScriptExecutionResult> {
  const runId = await createRun(db, executionContext.id, script.resource, batchId);

  if (!runId) {
    console.log(`Could not create run for ${executionContext.provider}:${script.resource}, skipping`);
    return { success: false, skipped: true };
  }

  try {
    const ranges = await calculateDateRanges(db, executionContext.id, script.resource, script.importWindowDays);

    // Execute forward sync (new data)
    if (ranges.forward) {
      await script.run(db, { ...executionContext, startDate: ranges.forward.startDate, endDate: ranges.forward.endDate, runId });
    }

    // Execute backfill (historical data)
    if (ranges.backfill) {
      await script.run(db, { ...executionContext, startDate: ranges.backfill.startDate, endDate: ranges.backfill.endDate, runId });
    }

    // Complete run with both boundaries
    const lastFetchedDataAt = ranges.forward?.endDate ?? new Date();
    const earliestFetchedDataAt = ranges.backfill?.startDate ?? ranges.forward?.startDate;

    await completeRun(db, runId, 0, lastFetchedDataAt, earliestFetchedDataAt);

    return { success: true, skipped: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Run failed for ${executionContext.provider}:${script.resource}: ${errorMessage}`);

    await failRun(db, runId, errorMessage);

    return { success: false, skipped: false, error: errorMessage };
  }
}
