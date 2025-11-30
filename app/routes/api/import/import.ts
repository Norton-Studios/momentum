import { runOrchestrator } from "@crons/orchestrator/runner.js";
import { type ActionFunctionArgs, data, type LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const hasEnabledDataSources = await db.dataSource.count({
    where: { isEnabled: true },
  });

  if (hasEnabledDataSources === 0) {
    return data({ error: "No enabled data sources found" }, { status: 400 });
  }

  const runningBatch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
  });

  if (runningBatch) {
    return data({
      batchId: runningBatch.id,
      status: "already_running",
      message: "An import is already in progress",
    });
  }

  runOrchestrator(db, { triggeredBy: user.id })
    .then((result) => {
      console.log(`Import completed: batch=${result.batchId}, ${result.scriptsExecuted} executed, ${result.scriptsFailed} failed`);
    })
    .catch((error) => {
      console.error("Import failed:", error);
    });

  const batch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
    orderBy: { createdAt: "desc" },
  });

  return data({
    batchId: batch?.id,
    status: "started",
    message: "Import started",
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const batches = await db.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      _count: {
        select: { runs: true },
      },
    },
  });

  return data({
    batches: batches.map((batch) => ({
      id: batch.id,
      status: batch.status,
      triggeredBy: batch.triggeredBy,
      startedAt: batch.startedAt.toISOString(),
      completedAt: batch.completedAt?.toISOString() ?? null,
      durationMs: batch.durationMs,
      totalScripts: batch.totalScripts,
      completedScripts: batch.completedScripts,
      failedScripts: batch.failedScripts,
      runCount: batch._count.runs,
    })),
  });
}
