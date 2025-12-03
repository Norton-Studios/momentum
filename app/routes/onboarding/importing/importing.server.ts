import { runOrchestrator } from "@crons/orchestrator/runner.js";
import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";

const SCRIPT_RESOURCES = ["repository", "contributor", "commit", "pull-request", "project", "issue"] as const;

export async function importingLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const dataSources = await db.dataSource.findMany({
    where: { isEnabled: true },
  });

  if (dataSources.length === 0) {
    return redirect("/onboarding/datasources");
  }

  const latestBatch = await db.importBatch.findFirst({
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

  const repositoryCount = await db.repository.count({
    where: { isEnabled: true },
  });

  const importStatus = buildImportStatus(dataSources, latestBatch?.runs ?? []);
  const isImportRunning = latestBatch?.status === "RUNNING";
  const hasStartedImport = latestBatch !== null;

  return data({
    dataSources: importStatus,
    repositoryCount,
    isImportRunning,
    hasStartedImport,
    currentBatch: latestBatch
      ? {
          id: latestBatch.id,
          status: latestBatch.status,
          totalScripts: latestBatch.totalScripts,
          completedScripts: latestBatch.completedScripts,
          failedScripts: latestBatch.failedScripts,
        }
      : null,
  });
}

export async function importingAction({ request }: ActionFunctionArgs) {
  const user = await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "start-import") {
    console.log("[importing] start-import action triggered");

    const runningBatch = await db.importBatch.findFirst({
      where: { status: "RUNNING" },
    });

    if (runningBatch) {
      console.log("[importing] Found existing running batch:", runningBatch.id);
      return data({ success: true, batchId: runningBatch.id });
    }

    console.log("[importing] Starting orchestrator...");
    runOrchestrator(db, { triggeredBy: user.id })
      .then((result) => {
        console.log(`[importing] Import completed: batch=${result.batchId}, ${result.scriptsExecuted} executed, ${result.scriptsFailed} failed`);
      })
      .catch((error) => {
        console.error("[importing] Import failed:", error);
      });

    console.log("[importing] Waiting for batch creation...");
    const batchId = await waitForBatchCreation();
    console.log("[importing] Batch ID after wait:", batchId);

    return data({ success: true, batchId });
  }

  if (intent === "continue") {
    return redirect("/onboarding/complete");
  }

  return data({ error: "Invalid intent" }, { status: 400 });
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

async function waitForBatchCreation(maxAttempts = 10, delayMs = 100): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const batch = await db.importBatch.findFirst({
      where: { status: "RUNNING" },
      orderBy: { createdAt: "desc" },
    });

    if (batch) {
      return batch.id;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
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
