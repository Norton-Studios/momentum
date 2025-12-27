import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { triggerImport } from "~/lib/import/trigger-import";

export async function importsLoader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);

  const batches = await db.importBatch.findMany({
    include: {
      runs: {
        select: {
          id: true,
          scriptName: true,
          status: true,
          recordsImported: true,
          recordsFailed: true,
          durationMs: true,
          errorMessage: true,
          startedAt: true,
          completedAt: true,
          dataSource: {
            select: {
              name: true,
              provider: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const isRunning = batches.some((b) => b.status === "RUNNING");

  return data({
    batches: batches.map((batch) => {
      // Calculate counts from actual runs for real-time progress (batch fields only update at end)
      const completedScripts = batch.runs.filter((run) => run.status === "COMPLETED").length;
      const failedScripts = batch.runs.filter((run) => run.status === "FAILED").length;

      return {
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
          scriptName: run.scriptName,
          status: run.status,
          recordsImported: run.recordsImported,
          recordsFailed: run.recordsFailed,
          durationMs: run.durationMs,
          errorMessage: run.errorMessage,
          startedAt: run.startedAt.toISOString(),
          completedAt: run.completedAt?.toISOString() ?? null,
          dataSource: run.dataSource,
        })),
      };
    }),
    isRunning,
    userName: user.name,
    user: { name: user.name, email: user.email },
  });
}

export async function importsAction({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "trigger-import") {
    const result = await triggerImport(user.name || user.email);

    if (result.status === "no_data_sources") {
      return data({ error: "No enabled data sources found. Please configure data sources first." }, { status: 400 });
    }

    if (result.status === "already_running") {
      return data({ batchId: result.batchId, alreadyRunning: true });
    }

    return data({ success: true, batchId: result.batchId });
  }

  return data({ error: "Invalid action" }, { status: 400 });
}
