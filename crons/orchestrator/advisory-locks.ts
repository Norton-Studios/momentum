import type { PrismaClient } from "@prisma/client";

const GLOBAL_ORCHESTRATOR_LOCK_ID = 999999;

export async function acquireGlobalOrchestratorLock(db: PrismaClient): Promise<boolean> {
  const [result] = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(${GLOBAL_ORCHESTRATOR_LOCK_ID})
  `;
  return result.pg_try_advisory_lock;
}

export async function releaseGlobalOrchestratorLock(db: PrismaClient): Promise<void> {
  await db.$queryRaw`SELECT pg_advisory_unlock(${GLOBAL_ORCHESTRATOR_LOCK_ID})`;
}

export async function acquireAdvisoryLock(db: PrismaClient, dataSourceId: string, resource: string): Promise<boolean> {
  const lockKey = `${dataSourceId}:${resource}`;
  const [result] = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey}))
  `;
  return result.pg_try_advisory_lock;
}

export async function releaseAdvisoryLock(db: PrismaClient, dataSourceId: string, resource: string): Promise<void> {
  const lockKey = `${dataSourceId}:${resource}`;
  await db.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
}
