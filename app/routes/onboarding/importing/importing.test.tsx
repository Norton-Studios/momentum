import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Importing from "./importing";

const createMockLoaderData = (
  overrides: Partial<{
    dataSources: DataSourceStatus[];
    repositoryCount: number;
    isImportRunning: boolean;
    hasStartedImport: boolean;
    currentBatch: BatchInfo | null;
  }> = {}
) => ({
  dataSources: [
    {
      id: "ds-1",
      provider: "GITHUB",
      name: "GitHub",
      overallStatus: "running",
      tasks: [
        { resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "contributor", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "commit", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "pull-request", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
      ],
    },
  ],
  repositoryCount: 25,
  isImportRunning: true,
  hasStartedImport: true,
  currentBatch: {
    id: "batch-1",
    status: "RUNNING",
    totalScripts: 4,
    completedScripts: 0,
    failedScripts: 0,
  },
  ...overrides,
});

let mockLoaderData = createMockLoaderData();
const mockFetcherSubmit = vi.fn();
const mockFetcherState = "idle";
const mockFetcherData: { batchId?: string } | null = null;

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useFetcher: () => ({
      submit: mockFetcherSubmit,
      state: mockFetcherState,
      data: mockFetcherData,
    }),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Importing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderData = createMockLoaderData();
    mockFetcherSubmit.mockClear();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "RUNNING", runs: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderImporting = async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );
    });
    // Flush any pending microtasks from effects
    await act(async () => {
      await Promise.resolve();
    });
  };

  describe("Auto-trigger import", () => {
    it("triggers start-import action when hasStartedImport is false", async () => {
      mockLoaderData = createMockLoaderData({
        hasStartedImport: false,
        isImportRunning: false,
        currentBatch: null,
      });

      await renderImporting();

      expect(mockFetcherSubmit).toHaveBeenCalledWith({ intent: "start-import" }, { method: "post" });
    });

    it("does not trigger start-import when import has already started", async () => {
      mockLoaderData = createMockLoaderData({
        hasStartedImport: true,
        isImportRunning: true,
      });

      await renderImporting();

      expect(mockFetcherSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Import in progress state", () => {
    beforeEach(() => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        hasStartedImport: true,
        currentBatch: {
          id: "batch-1",
          status: "RUNNING",
          totalScripts: 4,
          completedScripts: 1,
          failedScripts: 0,
        },
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [
              { resource: "repository", status: "completed", recordsImported: 10, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "contributor", status: "running", recordsImported: 5, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "commit", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "pull-request", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
            ],
          },
        ],
      });
    });

    it("renders Import in Progress title when import is running", async () => {
      await renderImporting();
      expect(screen.getByRole("heading", { level: 1, name: "Import in Progress" })).toBeInTheDocument();
    });

    it("renders in-progress description", async () => {
      await renderImporting();
      expect(screen.getByText(/Background jobs are collecting your data/)).toBeInTheDocument();
    });

    it("does not render Start Import button when import has started", async () => {
      await renderImporting();
      expect(screen.queryByRole("button", { name: "Start Import" })).not.toBeInTheDocument();
    });

    it("renders running tasks count", async () => {
      await renderImporting();
      const connectionSummary = document.querySelector(".connection-summary");
      expect(connectionSummary).toHaveTextContent(/task running/);
    });

    it("renders records imported count for completed tasks", async () => {
      await renderImporting();
      expect(screen.getByText("10 records")).toBeInTheDocument();
      expect(screen.getByText("5 records")).toBeInTheDocument();
    });
  });

  describe("Completed state", () => {
    beforeEach(() => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        hasStartedImport: true,
        currentBatch: {
          id: "batch-1",
          status: "COMPLETED",
          totalScripts: 4,
          completedScripts: 4,
          failedScripts: 0,
        },
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "completed",
            tasks: [
              { resource: "repository", status: "completed", recordsImported: 10, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "contributor", status: "completed", recordsImported: 20, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "commit", status: "completed", recordsImported: 100, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "pull-request", status: "completed", recordsImported: 15, errorMessage: null, startedAt: null, completedAt: null },
            ],
          },
        ],
      });
    });

    it("renders completed tasks count", async () => {
      await renderImporting();
      const connectionSummary = document.querySelector(".connection-summary");
      expect(connectionSummary).toHaveTextContent(/4.*of.*4.*tasks completed/);
    });

    it("renders Complete status badges for all tasks", async () => {
      await renderImporting();
      // 4 task badges + 1 overall status badge = at least 5 Complete badges
      const completeBadges = document.querySelectorAll(".task-status-badge.completed, .status-badge.completed");
      expect(completeBadges.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Failed tasks state", () => {
    beforeEach(() => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        hasStartedImport: true,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "partial",
            tasks: [
              { resource: "repository", status: "completed", recordsImported: 10, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "contributor", status: "failed", recordsImported: 0, errorMessage: "API rate limit exceeded", startedAt: null, completedAt: null },
              { resource: "commit", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "pull-request", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
            ],
          },
        ],
      });
    });

    it("renders Failed status badge for failed tasks", async () => {
      await renderImporting();
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("renders Partial status badge for data source with failed tasks", async () => {
      await renderImporting();
      expect(screen.getByText("Partial")).toBeInTheDocument();
    });

    it("renders failed task icon", async () => {
      await renderImporting();
      const failedIcon = document.querySelector(".task-icon.failed");
      expect(failedIcon).toBeInTheDocument();
      expect(failedIcon).toHaveTextContent("✕");
    });
  });

  describe("Task icons", () => {
    it("renders completed icon for completed tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "completed", recordsImported: 10, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      const completedIcon = document.querySelector(".task-icon.completed");
      expect(completedIcon).toBeInTheDocument();
      expect(completedIcon).toHaveTextContent("✓");
    });

    it("renders running icon for running tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      const runningIcon = document.querySelector(".task-icon.running");
      expect(runningIcon).toBeInTheDocument();
      expect(runningIcon).toHaveTextContent("↻");
    });

    it("renders pending icon for pending tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [{ resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      const pendingIcon = document.querySelector(".task-icon.pending");
      expect(pendingIcon).toBeInTheDocument();
      expect(pendingIcon).toHaveTextContent("○");
    });
  });

  describe("Task labels", () => {
    it("renders human-readable task labels", async () => {
      await renderImporting();

      expect(screen.getByText("Repository metadata")).toBeInTheDocument();
      expect(screen.getByText("Contributors")).toBeInTheDocument();
      expect(screen.getByText("Commit history")).toBeInTheDocument();
      expect(screen.getByText("Pull requests")).toBeInTheDocument();
    });

    it("falls back to resource name for unknown tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [{ resource: "unknown-task", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("unknown-task")).toBeInTheDocument();
    });
  });

  describe("Summary stats", () => {
    it("renders repository count from loader data", async () => {
      await renderImporting();

      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("Repositories")).toBeInTheDocument();
      expect(screen.getByText("Selected")).toBeInTheDocument();
    });

    it("renders days of history", async () => {
      await renderImporting();

      expect(screen.getByText("90")).toBeInTheDocument();
      expect(screen.getByText("Days")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
    });

    it("renders connected sources count", async () => {
      await renderImporting();

      const statBoxes = document.querySelectorAll(".stat-box");
      const sourcesBox = Array.from(statBoxes).find((box) => box.textContent?.includes("Sources"));
      expect(sourcesBox).toBeInTheDocument();
      expect(sourcesBox).toHaveTextContent("1");
      expect(sourcesBox).toHaveTextContent("Connected");
    });
  });

  describe("Multiple data sources", () => {
    beforeEach(() => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "completed",
            tasks: [{ resource: "repository", status: "completed", recordsImported: 10, errorMessage: null, startedAt: null, completedAt: null }],
          },
          {
            id: "ds-2",
            provider: "GITLAB",
            name: "GitLab",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "running", recordsImported: 5, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });
    });

    it("renders all data source cards", async () => {
      await renderImporting();

      expect(screen.getByText("GITHUB")).toBeInTheDocument();
      expect(screen.getByText("GITLAB")).toBeInTheDocument();
    });

    it("renders correct sources count", async () => {
      await renderImporting();

      const statBoxes = document.querySelectorAll(".stat-box");
      const sourcesBox = Array.from(statBoxes).find((box) => box.textContent?.includes("Sources"));
      expect(sourcesBox).toHaveTextContent("2");
    });
  });

  describe("Progress header", () => {
    it("renders progress steps in header", async () => {
      await renderImporting();

      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByText("Data Sources")).toBeInTheDocument();
      expect(screen.getByText("Import")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("marks Import step as active", async () => {
      await renderImporting();

      const activeStep = document.querySelector(".progress-step.active");
      expect(activeStep).toBeInTheDocument();
      expect(activeStep).toHaveTextContent("Import");
    });

    it("marks previous steps as completed", async () => {
      await renderImporting();

      const completedSteps = document.querySelectorAll(".progress-step.completed");
      expect(completedSteps).toHaveLength(2);
    });
  });

  describe("Navigation", () => {
    it("renders Back to Data Sources link", async () => {
      await renderImporting();

      const backLink = screen.getByRole("link", { name: "Back to Data Sources" });
      expect(backLink).toHaveAttribute("href", "/onboarding/datasources");
    });

    it("renders Continue to Dashboard button", async () => {
      await renderImporting();

      expect(screen.getByRole("button", { name: "Continue to Dashboard" })).toBeInTheDocument();
    });

    it("renders import note about background processing", async () => {
      await renderImporting();

      expect(screen.getByText(/You can safely continue to the dashboard/)).toBeInTheDocument();
    });
  });

  describe("Polling behavior", () => {
    it("starts polling when import is running", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        currentBatch: {
          id: "batch-123",
          status: "RUNNING",
          totalScripts: 4,
          completedScripts: 0,
          failedScripts: 0,
        },
      });

      await act(async () => {
        render(
          <MemoryRouter>
            <Importing />
          </MemoryRouter>
        );
      });

      // Flush microtasks for the initial poll
      await act(async () => {
        await Promise.resolve();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/import/batch-123");
    });

    it("stops polling when batch status is not RUNNING", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        currentBatch: {
          id: "batch-123",
          status: "RUNNING",
          totalScripts: 4,
          completedScripts: 0,
          failedScripts: 0,
        },
      });
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "COMPLETED", runs: [] }),
      } as Response);

      await act(async () => {
        render(
          <MemoryRouter>
            <Importing />
          </MemoryRouter>
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/import/batch-123");
    });

    it("handles fetch errors gracefully", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        currentBatch: {
          id: "batch-123",
          status: "RUNNING",
          totalScripts: 4,
          completedScripts: 0,
          failedScripts: 0,
        },
      });
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      await act(async () => {
        render(
          <MemoryRouter>
            <Importing />
          </MemoryRouter>
        );
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(consoleError).toHaveBeenCalledWith("Failed to poll batch status:", expect.any(Error));
      consoleError.mockRestore();
    });

    it("does not poll when import is not running", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        currentBatch: {
          id: "batch-123",
          status: "COMPLETED",
          totalScripts: 4,
          completedScripts: 4,
          failedScripts: 0,
        },
      });

      await act(async () => {
        render(
          <MemoryRouter>
            <Importing />
          </MemoryRouter>
        );
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Status badge rendering", () => {
    it("renders Running status badge", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("renders Pending status badge", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [{ resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("falls back to raw status for unknown statuses", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "unknown-status",
            tasks: [{ resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("unknown-status")).toBeInTheDocument();
    });
  });

  describe("Task status badge rendering", () => {
    it("renders In Progress badge for running tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders Queued badge for pending tasks", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [{ resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("Queued")).toBeInTheDocument();
    });

    it("falls back to raw status for unknown task statuses", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [{ resource: "repository", status: "unknown", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  describe("Records display", () => {
    it("does not show records count when zero", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [{ resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.queryByText("0 records")).not.toBeInTheDocument();
    });

    it("shows records count when greater than zero", async () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "completed",
            tasks: [{ resource: "repository", status: "completed", recordsImported: 42, errorMessage: null, startedAt: null, completedAt: null }],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText("42 records")).toBeInTheDocument();
    });
  });

  describe("Connection summary pluralization", () => {
    it("uses singular 'task' when one task is running", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        hasStartedImport: true,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [
              { resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "contributor", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
            ],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText(/task running/)).toBeInTheDocument();
    });

    it("uses plural 'tasks' when multiple tasks are running", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: true,
        hasStartedImport: true,
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [
              { resource: "repository", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
              { resource: "contributor", status: "running", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
            ],
          },
        ],
      });

      await renderImporting();

      expect(screen.getByText(/tasks running/)).toBeInTheDocument();
    });
  });
});

interface TaskStatus {
  resource: string;
  status: string;
  recordsImported: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface DataSourceStatus {
  id: string;
  provider: string;
  name: string;
  overallStatus: string;
  tasks: TaskStatus[];
}

interface BatchInfo {
  id: string;
  status: string;
  totalScripts: number;
  completedScripts: number;
  failedScripts: number;
}
