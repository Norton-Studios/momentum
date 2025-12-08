import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { triggerImport } from "~/lib/import/trigger-import";

const SCRIPT_RESOURCES = ["repository", "contributor", "commit", "pull-request", "project", "issue", "pipeline", "pipeline-run"] as const;

export async function importingLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const dataSources = await db.dataSource.findMany({
    where: { isEnabled: true },
  });

  if (dataSources.length === 0) {
    return redirect("/onboarding/datasources");
  }

  const repositoryCount = await db.repository.count({
    where: { isEnabled: true },
  });

  // Check if an import is running or recently completed
  const currentBatch = await db.importBatch.findFirst({
    where: { status: "RUNNING" },
    orderBy: { createdAt: "desc" },
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

  const importStatus = buildImportStatus(dataSources, currentBatch?.runs ?? []);
  const isImportRunning = currentBatch?.status === "RUNNING";

  return data({
    dataSources: importStatus,
    repositoryCount,
    isImportRunning,
    hasStartedImport: !!currentBatch,
    currentBatch: currentBatch
      ? {
          id: currentBatch.id,
          status: currentBatch.status,
          totalScripts: currentBatch.totalScripts,
          completedScripts: currentBatch.completedScripts,
          failedScripts: currentBatch.failedScripts,
        }
      : null,
  });
}

export async function importingAction({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "continue") {
    return redirect("/onboarding/complete");
  }

  if (intent === "start-import") {
    return handleStartImport(user.id);
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

async function handleStartImport(userId: string) {
  const result = await triggerImport(userId);
  return data({ success: true, batchId: result.status !== "no_data_sources" ? result.batchId : undefined });
}

function buildImportStatus(dataSources: DataSourceBasic[], runs: RunWithDataSource[]) {
  return dataSources.map((ds) => {
    const dsRuns = runs.filter((run) => run.dataSourceId === ds.id);

    const tasks = SCRIPT_RESOURCES.map((resource) => {
      const latestRun = dsRuns.find((run) => run.scriptName === resource);

      return {
        resource,
        status: getTaskStatus(latestRun),
        recordsImported: latestRun?.recordsImported ?? 0,
        errorMessage: latestRun?.errorMessage ?? null,
        startedAt: latestRun?.startedAt?.toISOString() ?? null,
        completedAt: latestRun?.completedAt?.toISOString() ?? null,
      };
    });

    const hasRunningTasks = tasks.some((t) => t.status === "running");
    const hasFailedTasks = tasks.some((t) => t.status === "failed");
    const allCompleted = tasks.every((t) => t.status === "completed");

    return {
      id: ds.id,
      provider: ds.provider,
      name: ds.name,
      overallStatus: hasRunningTasks ? "running" : hasFailedTasks ? "partial" : allCompleted ? "completed" : "pending",
      tasks,
    };
  });
}

function getTaskStatus(run: { status: string } | undefined): "pending" | "running" | "completed" | "failed" {
  if (!run) {
    return "pending";
  }

  switch (run.status) {
    case "RUNNING":
      return "running";
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

type DataSourceBasic = {
  id: string;
  provider: string;
  name: string;
};

type RunWithDataSource = {
  id: string;
  dataSourceId: string;
  scriptName: string | null;
  status: string;
  recordsImported: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  dataSource: {
    id: string;
    provider: string;
    name: string;
  };
};
