import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Imports from "./imports";

const mockLoaderData = {
  batches: [
    {
      id: "batch_123456",
      status: "COMPLETED",
      triggeredBy: "John Doe",
      startedAt: "2025-12-23T10:00:00Z",
      completedAt: "2025-12-23T10:05:00Z",
      durationMs: 300000,
      totalScripts: 10,
      completedScripts: 10,
      failedScripts: 0,
      runs: [
        {
          id: "run_1",
          scriptName: "repository",
          status: "COMPLETED",
          recordsImported: 150,
          recordsFailed: 0,
          durationMs: 30000,
          errorMessage: null,
          startedAt: "2025-12-23T10:00:00Z",
          completedAt: "2025-12-23T10:00:30Z",
          dataSource: {
            name: "GitHub",
            provider: "GITHUB",
          },
        },
      ],
    },
    {
      id: "batch_789012",
      status: "RUNNING",
      triggeredBy: "System",
      startedAt: "2025-12-23T11:00:00Z",
      completedAt: null,
      durationMs: null,
      totalScripts: 5,
      completedScripts: 2,
      failedScripts: 0,
      runs: [],
    },
  ],
  isRunning: true,
  userName: "John Doe",
};

const mockEmptyLoaderData = {
  batches: [],
  isRunning: false,
  userName: "John Doe",
};

describe("Imports Component", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "batch_789012",
        status: "RUNNING",
        triggeredBy: "System",
        startedAt: "2025-12-23T11:00:00Z",
        completedAt: null,
        durationMs: null,
        totalScripts: 5,
        completedScripts: 2,
        failedScripts: 0,
        runs: [],
      }),
    });
  });

  it("displays running import banner when import is in progress", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Import in Progress")).toBeInTheDocument();
      expect(screen.getAllByText(/batch_78/).length).toBeGreaterThan(0);
      expect(screen.getByText(/2 of 5 scripts completed/)).toBeInTheDocument();
    });
  });

  it("displays start import button when no import is running", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockEmptyLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Ready to Import")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /start import/i })).toBeInTheDocument();
    });
  });

  it("displays import history table with batches", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Import History")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("System")).toBeInTheDocument();
      expect(screen.getByText("10/10")).toBeInTheDocument();
      expect(screen.getByText("2/5")).toBeInTheDocument();
    });
  });

  it("expands batch details when clicking on a row", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Import History")).toBeInTheDocument();
    });

    const completedRow = screen.getByText(/batch_12/).closest("tr");
    expect(completedRow).toBeInTheDocument();

    if (completedRow) {
      await user.click(completedRow);
    }

    await waitFor(() => {
      expect(screen.getByText("Script Details")).toBeInTheDocument();
      expect(screen.getByText("repository")).toBeInTheDocument();
      expect(screen.getByText(/GitHub/)).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });
  });

  it("displays empty state when no batches exist", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockEmptyLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("No Import History")).toBeInTheDocument();
      expect(screen.getByText(/Import batches will appear here once you trigger your first import/)).toBeInTheDocument();
    });
  });

  it("formats duration correctly", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("5m 0s")).toBeInTheDocument();
    });
  });

  it("displays status badges with correct styling", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Imports />,
          loader: () => mockLoaderData,
        },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      const completedBadges = screen.getAllByText("Completed");
      const runningBadges = screen.getAllByText("Running");

      expect(completedBadges.length).toBeGreaterThan(0);
      expect(runningBadges.length).toBeGreaterThan(0);

      expect(completedBadges[0]).toHaveClass("status-badge-success");
      expect(runningBadges[0]).toHaveClass("status-badge-running");
    });
  });
});
