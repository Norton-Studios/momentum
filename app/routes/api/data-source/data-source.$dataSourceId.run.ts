import { data, type LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const { dataSourceId } = params;

  if (!dataSourceId) {
    return data({ error: "Data source ID required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const batchId = url.searchParams.get("batchId");

  const runs = await db.dataSourceRun.findMany({
    where: {
      dataSourceId,
      ...(batchId ? { importBatchId: batchId } : {}),
    },
    orderBy: { startedAt: "desc" },
    take: 50,
    include: {
      importBatch: {
        select: {
          id: true,
          status: true,
          triggeredBy: true,
        },
      },
    },
  });

  return data({
    runs: runs.map((run) => ({
      id: run.id,
      dataSourceId: run.dataSourceId,
      importBatchId: run.importBatchId,
      importBatch: run.importBatch,
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
