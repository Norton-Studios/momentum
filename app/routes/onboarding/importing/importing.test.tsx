import { render, screen, waitFor } from "@testing-library/react";
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
      overallStatus: "pending",
      tasks: [
        { resource: "repository", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "contributor", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "commit", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
        { resource: "pull-request", status: "pending", recordsImported: 0, errorMessage: null, startedAt: null, completedAt: null },
      ],
    },
  ],
  repositoryCount: 25,
  isImportRunning: false,
  hasStartedImport: false,
  currentBatch: null,
  ...overrides,
});

let mockLoaderData = createMockLoaderData();
let mockActionData: { batchId?: string } | undefined;

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useActionData: () => mockActionData,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Importing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderData = createMockLoaderData();
    mockActionData = undefined;
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "RUNNING", runs: [] }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Pre-import state", () => {
    it("renders Start Import title when import has not started", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { level: 1, name: "Start Import" })).toBeInTheDocument();
    });

    it("renders Start Import button when import has not started", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: "Start Import" })).toBeInTheDocument();
    });

    it("renders pre-import description", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/Start the import process to collect data from your connected sources/)).toBeInTheDocument();
    });

    it("renders ready message in connection summary", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/Ready to import from 1 data source/)).toBeInTheDocument();
    });

    it("pluralizes data sources correctly when multiple exist", () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          { id: "ds-1", provider: "GITHUB", name: "GitHub", overallStatus: "pending", tasks: [] },
          { id: "ds-2", provider: "GITLAB", name: "GitLab", overallStatus: "pending", tasks: [] },
        ],
      });

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/Ready to import from 2 data sources/)).toBeInTheDocument();
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

    it("renders Import in Progress title when import is running", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { level: 1, name: "Import in Progress" })).toBeInTheDocument();
    });

    it("renders in-progress description", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/Background jobs are collecting your data/)).toBeInTheDocument();
    });

    it("does not render Start Import button when import has started", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.queryByRole("button", { name: "Start Import" })).not.toBeInTheDocument();
    });

    it("renders running tasks count", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const connectionSummary = container.querySelector(".connection-summary");
      expect(connectionSummary).toHaveTextContent(/task running/);
    });

    it("renders records imported count for completed tasks", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

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

    it("renders completed tasks count", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const connectionSummary = container.querySelector(".connection-summary");
      expect(connectionSummary).toHaveTextContent(/4.*of.*4.*tasks completed/);
    });

    it("renders Complete status badges for all tasks", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      // 4 task badges + 1 overall status badge = at least 5 Complete badges
      const completeBadges = container.querySelectorAll(".task-status-badge.completed, .status-badge.completed");
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

    it("renders Failed status badge for failed tasks", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("renders Partial status badge for data source with failed tasks", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Partial")).toBeInTheDocument();
    });

    it("renders failed task icon", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const failedIcon = container.querySelector(".task-icon.failed");
      expect(failedIcon).toBeInTheDocument();
      expect(failedIcon).toHaveTextContent("✕");
    });
  });

  describe("Task icons", () => {
    it("renders completed icon for completed tasks", () => {
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

      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const completedIcon = container.querySelector(".task-icon.completed");
      expect(completedIcon).toBeInTheDocument();
      expect(completedIcon).toHaveTextContent("✓");
    });

    it("renders running icon for running tasks", () => {
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

      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const runningIcon = container.querySelector(".task-icon.running");
      expect(runningIcon).toBeInTheDocument();
      expect(runningIcon).toHaveTextContent("↻");
    });

    it("renders pending icon for pending tasks", () => {
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

      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const pendingIcon = container.querySelector(".task-icon.pending");
      expect(pendingIcon).toBeInTheDocument();
      expect(pendingIcon).toHaveTextContent("○");
    });
  });

  describe("Task labels", () => {
    it("renders human-readable task labels", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Repository metadata")).toBeInTheDocument();
      expect(screen.getByText("Contributors")).toBeInTheDocument();
      expect(screen.getByText("Commit history")).toBeInTheDocument();
      expect(screen.getByText("Pull requests")).toBeInTheDocument();
    });

    it("falls back to resource name for unknown tasks", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("unknown-task")).toBeInTheDocument();
    });
  });

  describe("Summary stats", () => {
    it("renders repository count from loader data", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("Repositories")).toBeInTheDocument();
      expect(screen.getByText("Selected")).toBeInTheDocument();
    });

    it("renders days of history", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("90")).toBeInTheDocument();
      expect(screen.getByText("Days")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
    });

    it("renders connected sources count", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const statBoxes = container.querySelectorAll(".stat-box");
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

    it("renders all data source cards", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("GITHUB")).toBeInTheDocument();
      expect(screen.getByText("GITLAB")).toBeInTheDocument();
    });

    it("renders correct sources count", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const statBoxes = container.querySelectorAll(".stat-box");
      const sourcesBox = Array.from(statBoxes).find((box) => box.textContent?.includes("Sources"));
      expect(sourcesBox).toHaveTextContent("2");
    });
  });

  describe("Progress header", () => {
    it("renders progress steps in header", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Welcome")).toBeInTheDocument();
      expect(screen.getByText("Data Sources")).toBeInTheDocument();
      expect(screen.getByText("Import")).toBeInTheDocument();
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("marks Import step as active", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const activeStep = container.querySelector(".progress-step.active");
      expect(activeStep).toBeInTheDocument();
      expect(activeStep).toHaveTextContent("Import");
    });

    it("marks previous steps as completed", () => {
      const { container } = render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const completedSteps = container.querySelectorAll(".progress-step.completed");
      expect(completedSteps).toHaveLength(2);
    });
  });

  describe("Navigation", () => {
    it("renders Back to Repositories link", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      const backLink = screen.getByRole("link", { name: "Back to Repositories" });
      expect(backLink).toHaveAttribute("href", "/onboarding/repositories");
    });

    it("renders Continue to Dashboard button", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: "Continue to Dashboard" })).toBeInTheDocument();
    });

    it("renders import note about background processing", () => {
      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/You can safely continue to the dashboard/)).toBeInTheDocument();
    });
  });

  describe("Polling behavior", () => {
    it("starts polling when actionData contains batchId", async () => {
      mockActionData = { batchId: "new-batch-123" };

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/import/new-batch-123");
      });
    });

    it("stops polling when batch status is not RUNNING", async () => {
      mockActionData = { batchId: "batch-123" };
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "COMPLETED", runs: [] }),
      } as Response);

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/import/batch-123");
      });
    });

    it("handles fetch errors gracefully", async () => {
      mockActionData = { batchId: "batch-123" };
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith("Failed to poll batch status:", expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it("uses actionData batchId over currentBatch id for polling", async () => {
      // When actionData has a batchId, it takes precedence
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        hasStartedImport: false,
        currentBatch: {
          id: "existing-batch-456",
          status: "COMPLETED",
          totalScripts: 4,
          completedScripts: 4,
          failedScripts: 0,
        },
      });
      mockActionData = { batchId: "new-batch-789" };

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/import/new-batch-789");
      });
    });
  });

  describe("Batch status updates from polling", () => {
    it("fetches batch data when actionData contains batchId", async () => {
      mockLoaderData = createMockLoaderData({
        isImportRunning: false,
        hasStartedImport: false,
      });
      mockActionData = { batchId: "batch-1" };

      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "batch-1",
            status: "RUNNING",
            totalScripts: 4,
            completedScripts: 1,
            failedScripts: 0,
            runs: [
              {
                id: "run-1",
                dataSourceId: "ds-1",
                scriptName: "repository",
                status: "COMPLETED",
                recordsImported: 50,
              },
            ],
          }),
      } as Response);

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/import/batch-1");
      });
    });
  });

  describe("Status badge rendering", () => {
    it("renders Running status badge", () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "running",
            tasks: [],
          },
        ],
      });

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("renders Pending status badge", () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "pending",
            tasks: [],
          },
        ],
      });

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("falls back to raw status for unknown statuses", () => {
      mockLoaderData = createMockLoaderData({
        dataSources: [
          {
            id: "ds-1",
            provider: "GITHUB",
            name: "GitHub",
            overallStatus: "unknown-status",
            tasks: [],
          },
        ],
      });

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("unknown-status")).toBeInTheDocument();
    });
  });

  describe("Task status badge rendering", () => {
    it("renders In Progress badge for running tasks", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders Queued badge for pending tasks", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("Queued")).toBeInTheDocument();
    });

    it("falls back to raw status for unknown task statuses", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("unknown")).toBeInTheDocument();
    });
  });

  describe("Records display", () => {
    it("does not show records count when zero", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.queryByText("0 records")).not.toBeInTheDocument();
    });

    it("shows records count when greater than zero", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText("42 records")).toBeInTheDocument();
    });
  });

  describe("Connection summary pluralization", () => {
    it("uses singular 'task' when one task is running", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

      expect(screen.getByText(/task running/)).toBeInTheDocument();
    });

    it("uses plural 'tasks' when multiple tasks are running", () => {
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

      render(
        <MemoryRouter>
          <Importing />
        </MemoryRouter>
      );

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
