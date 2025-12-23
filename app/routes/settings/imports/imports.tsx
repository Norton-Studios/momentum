import { Fragment, useCallback, useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { SettingsLayout } from "../settings-layout";
import { importsAction, importsLoader } from "./imports.server";
import "./imports.css";

export function meta() {
  return [{ title: "Import Settings - Momentum" }, { name: "description", content: "Trigger and monitor data imports" }];
}

export async function loader(args: LoaderFunctionArgs) {
  return importsLoader(args);
}

export async function action(args: ActionFunctionArgs) {
  return importsAction(args);
}

const POLLING_INTERVAL_MS = 3000;

export default function Imports() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [pollingBatchId, setPollingBatchId] = useState<string | null>(loaderData.isRunning && loaderData.batches.length > 0 ? loaderData.batches[0].id : null);
  const [polledBatch, setPolledBatch] = useState<PolledBatch | null>(null);

  const currentRunningBatch = polledBatch || loaderData.batches.find((b) => b.status === "RUNNING");

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.batchId) {
      setPollingBatchId(actionData.batchId);
    }
  }, [actionData]);

  const pollBatchStatus = useCallback(async (batchId: string) => {
    try {
      const response = await fetch(`/api/import/${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setPolledBatch(data);

        if (data.status !== "RUNNING") {
          setPollingBatchId(null);
        }
      }
    } catch (error) {
      console.error("Failed to poll batch status:", error);
    }
  }, []);

  useEffect(() => {
    if (!pollingBatchId) return;

    pollBatchStatus(pollingBatchId);
    const interval = setInterval(() => pollBatchStatus(pollingBatchId), POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pollingBatchId, pollBatchStatus]);

  const displayBatches = polledBatch ? [polledBatch, ...loaderData.batches.filter((b) => b.id !== polledBatch.id)] : loaderData.batches;

  return (
    <SettingsLayout activeTab="imports">
      {actionData && "error" in actionData && <div className="message message-error">{actionData.error}</div>}

      {actionData && "alreadyRunning" in actionData && <div className="message message-warning">An import is already running. Please wait for it to complete.</div>}

      <div className="settings-section">
        <h2 className="section-title">Data Imports</h2>
        <p className="section-description">Trigger manual data imports and view import history</p>

        {currentRunningBatch ? (
          <div className="import-status-banner running">
            <div className="status-banner-content">
              <div className="status-banner-icon">
                <span className="spinner">↻</span>
              </div>
              <div className="status-banner-info">
                <h3>Import in Progress</h3>
                {currentRunningBatch && (
                  <>
                    <p>
                      Batch ID: <code>{currentRunningBatch.id.substring(0, 8)}</code>
                    </p>
                    <p className="status-progress">
                      {currentRunningBatch.completedScripts} of {currentRunningBatch.totalScripts} scripts completed
                      {currentRunningBatch.failedScripts > 0 && `, ${currentRunningBatch.failedScripts} failed`}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="import-status-banner idle">
            <div className="status-banner-content">
              <div className="status-banner-info">
                <h3>Ready to Import</h3>
                <p>No import is currently running. Click the button below to start a new import.</p>
              </div>
              <Form method="post">
                <input type="hidden" name="intent" value="trigger-import" />
                <button type="submit" className="action-button action-button-primary">
                  Start Import
                </button>
              </Form>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2 className="section-title">Import History</h2>

        {displayBatches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3 className="empty-state-title">No Import History</h3>
            <p className="empty-state-description">Import batches will appear here once you trigger your first import.</p>
          </div>
        ) : (
          <table className="settings-table import-history-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Triggered By</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Scripts</th>
              </tr>
            </thead>
            <tbody>
              {displayBatches.map((batch) => (
                <Fragment key={batch.id}>
                  <tr className={`batch-row ${expandedBatchId === batch.id ? "expanded" : ""}`} onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}>
                    <td>
                      <code className="batch-id">{batch.id.substring(0, 8)}</code>
                    </td>
                    <td>{batch.triggeredBy || "System"}</td>
                    <td>{formatDateTime(batch.startedAt)}</td>
                    <td>{formatDuration(batch.durationMs)}</td>
                    <td>
                      <StatusBadge status={batch.status} />
                    </td>
                    <td>
                      <span className="script-summary">
                        {batch.completedScripts}/{batch.totalScripts}
                        {batch.failedScripts > 0 && <span className="failed-count"> ({batch.failedScripts} failed)</span>}
                      </span>
                    </td>
                  </tr>
                  {expandedBatchId === batch.id && (
                    <tr className="batch-details-row">
                      <td colSpan={6}>
                        <div className="batch-details">
                          <h4>Script Details</h4>
                          {batch.runs.length === 0 ? (
                            <p className="no-runs">No scripts have run yet</p>
                          ) : (
                            <table className="runs-table">
                              <thead>
                                <tr>
                                  <th>Script</th>
                                  <th>Data Source</th>
                                  <th>Status</th>
                                  <th>Records</th>
                                  <th>Duration</th>
                                  <th>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batch.runs.map((run) => (
                                  <tr key={run.id}>
                                    <td>
                                      <code>{run.scriptName || "Unknown"}</code>
                                    </td>
                                    <td>
                                      {run.dataSource?.name || "Unknown"} ({run.dataSource?.provider || "Unknown"})
                                    </td>
                                    <td>
                                      <StatusBadge status={run.status} small />
                                    </td>
                                    <td>
                                      {run.recordsImported > 0 && <span className="records-count">{run.recordsImported.toLocaleString()}</span>}
                                      {run.recordsFailed > 0 && <span className="records-failed"> ({run.recordsFailed} failed)</span>}
                                    </td>
                                    <td>{formatDuration(run.durationMs)}</td>
                                    <td>
                                      {run.errorMessage && (
                                        <span className="error-message" title={run.errorMessage}>
                                          {truncateError(run.errorMessage)}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SettingsLayout>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const classMap: Record<string, string> = {
    COMPLETED: "status-badge-success",
    FAILED: "status-badge-error",
    RUNNING: "status-badge-running",
    PENDING: "status-badge-pending",
    CANCELLED: "status-badge-warning",
  };

  const labelMap: Record<string, string> = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    RUNNING: "Running",
    PENDING: "Pending",
    CANCELLED: "Cancelled",
  };

  return <span className={`status-badge ${classMap[status] || ""} ${small ? "small" : ""}`}>{labelMap[status] || status}</span>;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(durationMs: number | null | undefined): string {
  if (!durationMs) return "-";

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function truncateError(error: string, maxLength = 50): string {
  if (error.length <= maxLength) return error;
  return `${error.substring(0, maxLength)}...`;
}

interface PolledBatch {
  id: string;
  status: string;
  triggeredBy: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  totalScripts: number;
  completedScripts: number;
  failedScripts: number;
  runs: BatchRun[];
}

interface BatchRun {
  id: string;
  scriptName: string | null;
  status: string;
  recordsImported: number;
  recordsFailed: number;
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  dataSource: {
    name: string;
    provider: string;
  } | null;
}
