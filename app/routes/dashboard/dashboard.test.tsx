import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Dashboard, { meta } from "./dashboard";

const mockDashboardData = {
  user: { id: "1", email: "john@example.com", name: "John Doe", role: "USER" },
  dateRange: {
    startDate: "2024-12-22T00:00:00.000Z",
    endDate: "2025-01-21T23:59:59.999Z",
    preset: "30d",
  },
  data: {
    overview: {
      repositories: 50,
      contributors: { count: 23, trend: { value: 10, type: "positive" } },
      commits: { count: 1098, trend: { value: 12, type: "negative" } },
      pullRequests: { count: 156, trend: { value: 8, type: "negative" } },
    },
    delivery: {
      deployments: { count: 12, trend: { value: 33, type: "positive" } },
      cycleTime: { avgTimeToMergeHours: 18.5 },
      commitTrend: [
        { date: "2025-01-15", value: 45 },
        { date: "2025-01-16", value: 52 },
      ],
      prActivity: { merged: 45, open: 23, waitingReview: 5 },
    },
    operational: {
      successRate: { value: 92.2, trend: { value: 2, type: "negative" } },
      avgDurationMs: 750000,
      stageBreakdown: [
        { name: "Build", avgDurationMs: 480000 },
        { name: "Test", avgDurationMs: 180000 },
        { name: "Deploy", avgDurationMs: 90000 },
      ],
    },
    quality: {
      overallCoverage: 76,
      newCodeCoverage: 85,
      coverageTrend: [
        { date: "2025-01-15", value: 74 },
        { date: "2025-01-20", value: 76 },
      ],
    },
  },
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockDashboardData,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

describe("Dashboard meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Organization Dashboard - Momentum" },
      {
        name: "description",
        content: "Comprehensive metrics across all teams and repositories",
      },
    ]);
  });
});

describe("Dashboard", () => {
  it("renders logo in header", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Momentum/)).toBeInTheDocument();
  });

  it("renders user profile", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders main navigation with all tabs", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Organization" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Individual" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders page header with title and subtitle", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Organization Overview" })).toBeInTheDocument();
    expect(screen.getByText("Comprehensive metrics across all teams and repositories")).toBeInTheDocument();
  });

  it("renders date selector buttons", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("renders overview cards with metrics", () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const overviewCards = container.querySelectorAll(".overview-card");
    expect(overviewCards).toHaveLength(4);

    expect(screen.getByText("Repositories")).toBeInTheDocument();
    expect(screen.getByText("Active projects")).toBeInTheDocument();

    expect(screen.getByText("Contributors")).toBeInTheDocument();
    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
  });

  it("renders Delivery section with metric cards", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Deployment Velocity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Commit & PR Activity" })).toBeInTheDocument();
  });

  it("renders Operational section with pipeline metrics", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Pipeline Success Rate" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Pipeline Duration" })).toBeInTheDocument();
  });

  it("renders Quality section with code coverage", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Code Coverage" })).toBeInTheDocument();
  });

  it("renders View All links for metric cards", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const viewAllLinks = screen.getAllByRole("link", { name: "View All" });
    expect(viewAllLinks.length).toBeGreaterThan(0);
  });

  it("renders metric stats for deployment velocity", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Time to Merge")).toBeInTheDocument();
    expect(screen.getAllByText("Open PRs").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting Review")).toBeInTheDocument();
  });

  it("renders metric stats for commit and PR activity", () => {
    const { container } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const statValues = container.querySelectorAll(".stat-value");
    const statLabels = container.querySelectorAll(".stat-label");

    expect(statValues.length).toBeGreaterThan(0);
    expect(statLabels.length).toBeGreaterThan(0);

    expect(screen.getByText("PRs Merged")).toBeInTheDocument();
    expect(screen.getByText("Avg Time to Merge")).toBeInTheDocument();
  });
});
