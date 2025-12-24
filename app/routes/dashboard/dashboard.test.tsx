import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Dashboard, { meta } from "./dashboard";

const mockDashboardData = {
  user: { id: "1", email: "john@example.com", name: "John Doe", role: "USER" },
  teams: [],
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
      avgPrAgeDays: 3.5,
      openPRs: 34,
      commitsToMaster: 156,
      avgTimeToReviewHours: 12.5,
    },
    tickets: {
      avgActiveTicketAgeDays: 5.2,
      activeCount: 45,
      completedCount: 32,
      cumulativeTimeInColumnHours: 120.5,
    },
    operational: {
      masterSuccessRate: 92.5,
      prSuccessRate: 88.3,
      masterAvgDurationMs: 750000,
      prAvgDurationMs: 650000,
      masterFailureSteps: [{ name: "Build", value: 5 }],
      prFailureSteps: [{ name: "Test", value: 10 }],
    },
    quality: {
      overallCoverage: 76,
      bugsCount: 12,
    },
    security: {
      cveBySeverity: { critical: 0, high: 2, medium: 5, low: 10 },
      avgTimeToCloseDays: 14.5,
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

  it("renders main navigation", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Organization" })).toBeInTheDocument();
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

  it("renders Delivery section with two-column metrics", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByText("Average PR Age")).toBeInTheDocument();
    expect(screen.getByText("Average Active Ticket Age")).toBeInTheDocument();
    expect(screen.getByText("Num PRs Open")).toBeInTheDocument();
    expect(screen.getByText("Num Active Tickets")).toBeInTheDocument();
    expect(screen.getByText("Commits to Master")).toBeInTheDocument();
    expect(screen.getByText("Tickets Completed")).toBeInTheDocument();
    expect(screen.getByText("Time to Review")).toBeInTheDocument();
    expect(screen.getByText("Cumulative Time in Column")).toBeInTheDocument();
  });

  it("renders Operational section with pipeline metrics", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Success (Master, 7d)")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Success (PR, 7d)")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Duration (Master)")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Duration (PR)")).toBeInTheDocument();
    expect(screen.getByText("Failure Steps (Master)")).toBeInTheDocument();
    expect(screen.getByText("Failure Steps (PR)")).toBeInTheDocument();
  });

  it("renders Quality section with coverage and bugs", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByText("Code Coverage")).toBeInTheDocument();
    expect(screen.getByText("Sonar Bugs")).toBeInTheDocument();
  });

  it("renders Security section with CVE metrics", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("CVEs by Severity")).toBeInTheDocument();
    expect(screen.getByText("Avg Time to Close CVE")).toBeInTheDocument();
  });

  it("displays formatted metric values", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("4d")).toBeInTheDocument();
    expect(screen.getByText("5d")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("76.0%")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
