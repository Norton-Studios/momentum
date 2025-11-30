import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Importing from "./importing";

const mockLoaderData = {
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
  repositoryCount: 25,
  isImportRunning: true,
  hasStartedImport: true,
  currentBatch: {
    id: "batch-1",
    status: "RUNNING",
    totalScripts: 4,
    completedScripts: 1,
    failedScripts: 0,
  },
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useActionData: () => undefined,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Importing", () => {
  it("renders page title when import is running", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Import in Progress" })).toBeInTheDocument();
  });

  it("renders repository count from loader data", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Repositories")).toBeInTheDocument();
  });

  it("renders data source card with tasks", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByText("GITHUB")).toBeInTheDocument();
    expect(screen.getByText("Repository metadata")).toBeInTheDocument();
    expect(screen.getByText("Contributors")).toBeInTheDocument();
    expect(screen.getByText("Commit history")).toBeInTheDocument();
    expect(screen.getByText("Pull requests")).toBeInTheDocument();
  });

  it("renders task status badges", () => {
    const { container } = render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    const taskBadges = container.querySelectorAll(".task-status-badge");
    expect(taskBadges.length).toBe(4);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getAllByText("Queued")).toHaveLength(2);
  });

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

  it("renders running tasks count", () => {
    const { container } = render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    const connectionSummary = container.querySelector(".connection-summary");
    expect(connectionSummary).toBeInTheDocument();
    expect(screen.getByText(/task running/)).toBeInTheDocument();
  });

  it("renders progress steps in header", () => {
    const { container } = render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    const progressIndicator = container.querySelector(".progress-indicator");
    expect(progressIndicator).toBeInTheDocument();
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Data Sources")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });
});
