import { data, type LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const { dataSourceId, runId } = params;

  if (!dataSourceId || !runId) {
    return data({ error: "Data source ID and run ID required" }, { status: 400 });
  }

  const run = await db.dataSourceRun.findFirst({
    where: {
      id: runId,
      dataSourceId,
    },
    include: {
      dataSource: {
        select: {
          id: true,
          provider: true,
          name: true,
        },
      },
      importBatch: {
        select: {
          id: true,
          status: true,
          triggeredBy: true,
          startedAt: true,
          completedAt: true,
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!run) {
    return data({ error: "Run not found" }, { status: 404 });
  }

  return data({
    id: run.id,
    dataSourceId: run.dataSourceId,
    dataSource: run.dataSource,
    importBatchId: run.importBatchId,
    importBatch: run.importBatch
      ? {
          ...run.importBatch,
          startedAt: run.importBatch.startedAt.toISOString(),
          completedAt: run.importBatch.completedAt?.toISOString() ?? null,
        }
      : null,
    scriptName: run.scriptName,
    status: run.status,
    recordsImported: run.recordsImported,
    recordsFailed: run.recordsFailed,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    errorMessage: run.errorMessage,
    lastFetchedDataAt: run.lastFetchedDataAt?.toISOString() ?? null,
    logs: run.logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      details: log.details,
      recordId: log.recordId,
      createdAt: log.createdAt.toISOString(),
    })),
  });
}
