import type { DbClient } from "~/db.server.js";

const GLOBAL_ORCHESTRATOR_LOCK_ID = "global_orchestrator_lock";

export async function acquireGlobalOrchestratorLock(db: DbClient): Promise<boolean> {
  return acquireAdvisoryLock(db, GLOBAL_ORCHESTRATOR_LOCK_ID);
}

export async function releaseGlobalOrchestratorLock(db: DbClient): Promise<void> {
  await releaseAdvisoryLock(db, GLOBAL_ORCHESTRATOR_LOCK_ID);
}

export async function acquireAdvisoryLock(db: DbClient, lockKey: string): Promise<boolean> {
  const [result] = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey}))
  `;
  return result.pg_try_advisory_lock;
}

export async function releaseAdvisoryLock(db: DbClient, lockKey: string): Promise<void> {
  await db.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
}
