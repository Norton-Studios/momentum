import { type ActionFunctionArgs, data, type LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { triggerImport } from "~/lib/import/trigger-import";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const result = await triggerImport(user.id);

  if (result.status === "no_data_sources") {
    return data({ error: "No enabled data sources found" }, { status: 400 });
  }

  if (result.status === "already_running") {
    return data({
      batchId: result.batchId,
      status: "already_running",
      message: "An import is already in progress",
    });
  }

  // Poll for the newly created batch (fire-and-forget orchestrator creates it async)
  const newBatch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
    orderBy: { createdAt: "desc" },
  });

  return data({
    batchId: newBatch?.id,
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
