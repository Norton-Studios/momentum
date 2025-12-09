import { useCallback, useEffect, useRef, useState } from "react";
import { Form, useFetcher, useLoaderData } from "react-router";
import { Button } from "../../../components/button/button";
import { Logo } from "../../../components/logo/logo";
import type { importingLoader } from "./importing.server";
import "./importing.css";

export { importingAction as action, importingLoader as loader } from "./importing.server";

const TASK_LABELS: Record<string, string> = {
  repository: "Repository metadata",
  contributor: "Contributors",
  commit: "Commit history",
  "pull-request": "Pull requests",
  project: "Projects",
  issue: "Issues",
  pipeline: "CI/CD Pipelines",
  "pipeline-run": "Pipeline runs",
};

const POLLING_INTERVAL_MS = 3000;

export default function Importing() {
  const loaderData = useLoaderData<typeof importingLoader>();
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [isPolling, setIsPolling] = useState(loaderData.isImportRunning);
  const startImportFetcher = useFetcher();
  const hasTriggeredImport = useRef(false);

  const batchId = batchStatus?.id ?? loaderData.currentBatch?.id;

  // Auto-trigger import if not started
  useEffect(() => {
    if (!loaderData.hasStartedImport && !hasTriggeredImport.current && startImportFetcher.state === "idle") {
      hasTriggeredImport.current = true;
      startImportFetcher.submit({ intent: "start-import" }, { method: "post" });
    }
  }, [loaderData.hasStartedImport, startImportFetcher]);

  // When import is triggered, start polling
  useEffect(() => {
    if (startImportFetcher.data && "batchId" in startImportFetcher.data) {
      setIsPolling(true);
    }
  }, [startImportFetcher.data]);

  const pollBatchStatus = useCallback(async () => {
    const currentBatchId = batchId ?? (startImportFetcher.data as { batchId?: string } | undefined)?.batchId;
    if (!currentBatchId) return;

    try {
      const response = await fetch(`/api/import/${currentBatchId}`);
      if (response.ok) {
        const data = await response.json();
        setBatchStatus(data);

        if (data.status !== "RUNNING") {
          setIsPolling(false);
        }
      }
    } catch (error) {
      console.error("Failed to poll batch status:", error);
    }
  }, [batchId, startImportFetcher.data]);

  // Start polling immediately if import is running
  useEffect(() => {
    if (loaderData.isImportRunning && batchId) {
      pollBatchStatus();
    }
  }, [loaderData.isImportRunning, batchId, pollBatchStatus]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(pollBatchStatus, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPolling, pollBatchStatus]);

  const dataSources = batchStatus ? buildDataSourcesFromBatch(loaderData.dataSources, batchStatus.runs) : loaderData.dataSources;
  const isImportRunning = batchStatus ? batchStatus.status === "RUNNING" : loaderData.isImportRunning;

  const totalTasks = dataSources.reduce((acc, ds) => acc + ds.tasks.length, 0);
  const completedTasks = dataSources.reduce((acc, ds) => acc + ds.tasks.filter((t) => t.status === "completed").length, 0);
  const runningTasks = dataSources.reduce((acc, ds) => acc + ds.tasks.filter((t) => t.status === "running").length, 0);

  return (
    <>
      <header className="onboarding-header">
        <div className="header-content">
          <Logo />
          <div className="progress-indicator">
            <div className="progress-step completed">
              <span className="step-number">1</span>
              <span>Welcome</span>
            </div>
            <div className="progress-step completed">
              <span className="step-number">2</span>
              <span>Data Sources</span>
            </div>
            <div className="progress-step active">
              <span className="step-number">3</span>
              <span>Import</span>
            </div>
            <div className="progress-step">
              <span className="step-number">4</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </header>

      <main className="onboarding-main">
        <div className="page-header">
          <h1>Import in Progress</h1>
          <p>Background jobs are collecting your data. You can continue to the dashboard while this runs.</p>
        </div>

        <div className="import-summary-card">
          <div className="summary-stats">
            <div className="stat-box">
              <span className="stat-number">{loaderData.repositoryCount}</span>
              <span className="stat-title">Repositories</span>
              <span className="stat-subtitle">Selected</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">90</span>
              <span className="stat-title">Days</span>
              <span className="stat-subtitle">History</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{dataSources.length}</span>
              <span className="stat-title">Sources</span>
              <span className="stat-subtitle">Connected</span>
            </div>
          </div>
        </div>

        {dataSources.map((dataSource) => (
          <div className="tasks-card" key={dataSource.id}>
            <div className="tasks-header">
              <h2 className="tasks-title">{dataSource.provider}</h2>
              <StatusBadge status={dataSource.overallStatus} />
            </div>
            <div className="tasks-list">
              {dataSource.tasks.map((task) => (
                <div className="task-row" key={task.resource}>
                  <div className="task-info">
                    <TaskIcon status={task.status} />
                    <span className="task-name">{TASK_LABELS[task.resource] || task.resource}</span>
                  </div>
                  <div className="task-meta">
                    {task.recordsImported > 0 && <span className="task-count">{task.recordsImported} records</span>}
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="import-note">You can safely continue to the dashboard — the import will run in the background and data will appear as it becomes available.</p>

        <div className="bottom-actions">
          <div className="connection-summary">
            {isImportRunning ? (
              <>
                <strong>{runningTasks}</strong> task{runningTasks !== 1 ? "s" : ""} running, <strong>{completedTasks}</strong> of <strong>{totalTasks}</strong> completed
              </>
            ) : (
              <>
                <strong>{completedTasks}</strong> of <strong>{totalTasks}</strong> tasks completed
              </>
            )}
          </div>
          <div className="action-buttons">
            <a href="/onboarding/datasources" className="skip-link">
              Back to Data Sources
            </a>
            <Form method="post">
              <input type="hidden" name="intent" value="continue" />
              <Button type="submit">Continue to Dashboard</Button>
            </Form>
          </div>
        </div>
      </main>
    </>
  );
}

function TaskIcon({ status }: { status: string }) {
  if (status === "completed") {
    return <span className="task-icon completed">✓</span>;
  }
  if (status === "running") {
    return <span className="task-icon running">↻</span>;
  }
  if (status === "failed") {
    return <span className="task-icon failed">✕</span>;
  }
  return <span className="task-icon pending">○</span>;
}

function TaskStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Queued",
    running: "In Progress",
    completed: "Complete",
    failed: "Failed",
  };

  return <span className={`task-status-badge ${status}`}>{labels[status] || status}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Pending",
    running: "Running",
    completed: "Complete",
    partial: "Partial",
  };

  return <span className={`status-badge ${status}`}>{labels[status] || status}</span>;
}

function buildDataSourcesFromBatch(dataSources: DataSourceStatus[], runs: BatchRun[]): DataSourceStatus[] {
  return dataSources.map((ds) => {
    const dsRuns = runs.filter((run) => run.dataSourceId === ds.id);

    const tasks = ds.tasks.map((task) => {
      const latestRun = dsRuns.find((run) => run.scriptName === task.resource);
      if (!latestRun) return task;

      return {
        ...task,
        status: mapRunStatus(latestRun.status),
        recordsImported: latestRun.recordsImported,
      };
    });

    const hasRunningTasks = tasks.some((t) => t.status === "running");
    const hasFailedTasks = tasks.some((t) => t.status === "failed");
    const allCompleted = tasks.every((t) => t.status === "completed");

    return {
      ...ds,
      overallStatus: hasRunningTasks ? "running" : hasFailedTasks ? "partial" : allCompleted ? "completed" : "pending",
      tasks,
    };
  });
}

function mapRunStatus(status: string): "pending" | "running" | "completed" | "failed" {
  switch (status) {
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

interface BatchStatus {
  id: string;
  status: string;
  totalScripts: number;
  completedScripts: number;
  failedScripts: number;
  runs: BatchRun[];
}

interface BatchRun {
  id: string;
  dataSourceId: string;
  scriptName: string | null;
  status: string;
  recordsImported: number;
}

interface DataSourceStatus {
  id: string;
  provider: string;
  name: string;
  overallStatus: string;
  tasks: TaskStatus[];
}

interface TaskStatus {
  resource: string;
  status: string;
  recordsImported: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}
