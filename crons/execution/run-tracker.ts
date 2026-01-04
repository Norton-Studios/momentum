import type { DbClient } from "~/db.server.js";

const STALE_RUN_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export async function createRun(db: DbClient, dataSourceId: string, scriptName: string, importBatchId?: string): Promise<string | null> {
  try {
    const run = await db.dataSourceRun.create({
      data: {
        dataSourceId,
        scriptName,
        importBatchId,
        status: "RUNNING",
        startedAt: new Date(),
        recordsImported: 0,
        recordsFailed: 0,
      },
    });
    return run.id;
  } catch (error) {
    console.error("Error creating data source run:", error);
  }
  return null;
}

export async function completeRun(db: DbClient, runId: string, recordsImported: number, lastFetchedDataAt: Date, earliestFetchedDataAt?: Date): Promise<void> {
  const completedAt = new Date();
  const run = await db.dataSourceRun.findUnique({ where: { id: runId } });

  if (!run) {
    throw new Error(`DataSourceRun ${runId} not found`);
  }

  const durationMs = completedAt.getTime() - run.startedAt.getTime();

  await db.dataSourceRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      recordsImported,
      lastFetchedDataAt,
      earliestFetchedDataAt: earliestFetchedDataAt ?? lastFetchedDataAt,
      completedAt,
      durationMs,
    },
  });
}

export async function failRun(db: DbClient, runId: string, errorMessage: string): Promise<void> {
  const completedAt = new Date();
  const run = await db.dataSourceRun.findUnique({ where: { id: runId } });

  if (!run) {
    throw new Error(`DataSourceRun ${runId} not found`);
  }

  const durationMs = completedAt.getTime() - run.startedAt.getTime();

  await db.dataSourceRun.update({
    where: { id: runId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt,
      durationMs,
    },
  });
}

export async function cleanupStaleRuns(db: DbClient): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_RUN_THRESHOLD_MS);

  const result = await db.dataSourceRun.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: staleThreshold },
    },
    data: {
      status: "FAILED",
      errorMessage: "Run timed out - marked as failed after being stuck in RUNNING state",
      completedAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(`Cleaned up ${result.count} stale run(s)`);
  }

  return result.count;
}
