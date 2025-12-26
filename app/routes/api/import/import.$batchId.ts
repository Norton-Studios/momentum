import { data, type LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const { batchId } = params;

  if (!batchId) {
    return data({ error: "Batch ID required" }, { status: 400 });
  }

  const batch = await db.importBatch.findUnique({
    where: { id: batchId },
    include: {
      runs: {
        orderBy: { startedAt: "desc" },
        include: {
          dataSource: {
            select: {
              id: true,
              provider: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!batch) {
    return data({ error: "Batch not found" }, { status: 404 });
  }

  // Calculate counts from actual runs for real-time progress (batch fields only update at end)
  const completedScripts = batch.runs.filter((run) => run.status === "COMPLETED").length;
  const failedScripts = batch.runs.filter((run) => run.status === "FAILED").length;

  return data({
    id: batch.id,
    status: batch.status,
    triggeredBy: batch.triggeredBy,
    startedAt: batch.startedAt.toISOString(),
    completedAt: batch.completedAt?.toISOString() ?? null,
    durationMs: batch.durationMs,
    totalScripts: batch.totalScripts,
    completedScripts,
    failedScripts,
    runs: batch.runs.map((run) => ({
      id: run.id,
      dataSourceId: run.dataSourceId,
      dataSource: run.dataSource,
      scriptName: run.scriptName,
      status: run.status,
      recordsImported: run.recordsImported,
      recordsFailed: run.recordsFailed,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      durationMs: run.durationMs,
      errorMessage: run.errorMessage,
    })),
  });
}
