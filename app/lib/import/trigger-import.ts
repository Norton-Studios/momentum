import { cleanupStaleRuns } from "@crons/execution/run-tracker.js";
import { runOrchestrator } from "@crons/orchestrator/runner.js";
import { db } from "~/db.server";

const STALE_BATCH_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export type TriggerImportResult = { status: "no_data_sources" } | { status: "already_running"; batchId: string } | { status: "started"; batchId?: string };

async function cleanupStaleBatches(): Promise<void> {
  const staleThreshold = new Date(Date.now() - STALE_BATCH_THRESHOLD_MS);

  const result = await db.importBatch.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: staleThreshold },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
    },
  });

  if (result.count > 0) {
    console.log(`Cleaned up ${result.count} stale import batch(es)`);
  }
}

export async function triggerImport(triggeredBy: string): Promise<TriggerImportResult> {
  // Clean up any stale runs/batches before checking status
  await cleanupStaleBatches();
  await cleanupStaleRuns(db);

  const hasEnabledDataSources = await db.dataSource.count({
    where: { isEnabled: true },
  });

  if (hasEnabledDataSources === 0) {
    return { status: "no_data_sources" };
  }

  const runningBatch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
  });

  if (runningBatch) {
    return { status: "already_running", batchId: runningBatch.id };
  }

  // Fire-and-forget - runOrchestrator handles its own transaction internally
  runOrchestrator(db, { triggeredBy })
    .then((result) => {
      console.log(`Import completed: batch=${result.batchId}, ${result.scriptsExecuted} executed, ${result.scriptsFailed} failed (${result.executionTimeMs}ms)`);
      if (result.errors.length > 0) {
        console.error(`Errors: ${result.errors.map((e) => `${e.script}: ${e.error}`).join(", ")}`);
      }
    })
    .catch((error) => {
      console.error("Import failed:", error);
    });

  return { status: "started" };
}
