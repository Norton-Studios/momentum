import { runOrchestrator } from "@crons/orchestrator/runner.js";
import { db } from "~/db.server";

export async function triggerImport(triggeredBy: string): Promise<TriggerImportResult> {
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

  await new Promise((resolve) => setTimeout(resolve, 100));

  const batch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
    orderBy: { createdAt: "desc" },
  });

  return { status: "started", batchId: batch?.id };
}

type TriggerImportResult = { status: "no_data_sources" } | { status: "already_running"; batchId: string } | { status: "started"; batchId?: string };
