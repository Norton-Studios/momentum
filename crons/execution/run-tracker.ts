import type { PrismaClient } from "@prisma/client";

export async function createRun(db: PrismaClient, dataSourceId: string, scriptName: string): Promise<string> {
  const run = await db.dataSourceRun.create({
    data: {
      dataSourceId,
      scriptName,
      status: "RUNNING",
      startedAt: new Date(),
      recordsImported: 0,
      recordsFailed: 0,
    },
  });

  return run.id;
}

export async function completeRun(db: PrismaClient, runId: string, recordsImported: number, lastFetchedDataAt: Date): Promise<void> {
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
      completedAt,
      durationMs,
    },
  });
}

export async function failRun(db: PrismaClient, runId: string, errorMessage: string): Promise<void> {
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
