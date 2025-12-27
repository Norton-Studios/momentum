import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import IndividualDashboard, { meta } from "./individual";

const mockContributor = {
  id: "contributor-1",
  name: "Jane Smith",
  username: "janesmith",
  avatarUrl: "https://example.com/avatar.jpg",
};

const mockDashboardData = {
  user: { id: "1", email: "john@example.com", name: "John Doe", role: "USER" },
  contributors: [mockContributor],
  selectedContributorId: "contributor-1",
  dateRange: {
    startDate: "2024-12-22T00:00:00.000Z",
    endDate: "2025-01-21T23:59:59.999Z",
    preset: "30d",
  },
  data: {
    commits: {
      total: 156,
      dailyAverage: 5.2,
      linesAdded: 12456,
      linesRemoved: 3210,
      filesChanged: 89,
      chart: [{ date: "2025-01-01", value: 5 }],
    },
    pullRequests: {
      created: 18,
      merged: 15,
      mergeRate: 83.3,
      avgIterations: 2.1,
      chart: [{ date: "2025-01-01", value: 2 }],
    },
    reviews: {
      count: 42,
      avgTimeToReviewHours: 4.5,
      chart: [{ date: "2025-01-01", value: 3 }],
    },
    streaks: {
      currentStreak: 12,
      longestStreak: 45,
    },
    achievements: [
      { id: "first-commit", name: "First Commit", icon: "commit", earned: true },
      { id: "100-commits", name: "Century", icon: "century", earned: true, description: "100 commits" },
      { id: "7-day-streak", name: "Week Warrior", icon: "fire", earned: true, description: "7-day streak" },
    ],
    heatmap: [
      { date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 },
      { date: "2025-01-02", count: 3, dayOfWeek: 4, weekNumber: 0 },
    ],
    distributions: {
      repositories: [
        { name: "frontend-app", value: 80 },
        { name: "backend-api", value: 50 },
      ],
      languages: [
        { name: "TypeScript", value: 100 },
        { name: "JavaScript", value: 30 },
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

describe("IndividualDashboard meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Individual Dashboard - Momentum" },
      {
        name: "description",
        content: "Personal productivity metrics and achievements",
      },
    ]);
  });
});

describe("IndividualDashboard", () => {
  it("renders logo in header", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Momentum/)).toBeInTheDocument();
  });

  it("renders user profile", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders main navigation with Individual active", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Organization" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Individual" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders page header with contributor name", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Jane Smith" })).toBeInTheDocument();
    expect(screen.getByText("Personal productivity metrics and achievements")).toBeInTheDocument();
  });

  it("renders date selector buttons", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("renders streak cards", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Current Streak")).toBeInTheDocument();
    expect(screen.getByText("Longest Streak")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("renders achievement badges", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Achievements")).toBeInTheDocument();
    expect(screen.getByText("First Commit")).toBeInTheDocument();
    expect(screen.getByText("Century")).toBeInTheDocument();
    expect(screen.getByText("Week Warrior")).toBeInTheDocument();
  });

  it("renders commit heatmap section", () => {
    const { container } = render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Commit Activity")).toBeInTheDocument();
    const heatmapValue = container.querySelector(".heatmap-value");
    expect(heatmapValue?.textContent).toBe("156");
  });

  it("renders Commits section with metrics", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("Total Commits")).toBeInTheDocument();
    expect(screen.getByText("Daily Average")).toBeInTheDocument();
    expect(screen.getByText("Lines Added")).toBeInTheDocument();
    expect(screen.getByText("Lines Removed")).toBeInTheDocument();
    expect(screen.getByText("+12,456")).toBeInTheDocument();
    expect(screen.getByText("-3,210")).toBeInTheDocument();
  });

  it("renders Pull Requests section with metrics", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("PRs Created")).toBeInTheDocument();
    expect(screen.getByText("PRs Merged")).toBeInTheDocument();
    expect(screen.getByText("Merge Rate")).toBeInTheDocument();
    expect(screen.getByText("Avg Iterations")).toBeInTheDocument();
    expect(screen.getByText("83.3%")).toBeInTheDocument();
    expect(screen.getByText("2.1")).toBeInTheDocument();
  });

  it("renders Code Reviews section with metrics", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Code Reviews")).toBeInTheDocument();
    expect(screen.getByText("Reviews Given")).toBeInTheDocument();
    expect(screen.getByText("Avg Time to Review")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("5h")).toBeInTheDocument();
  });

  it("renders Distributions section with pie charts", () => {
    render(
      <MemoryRouter>
        <IndividualDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Distributions")).toBeInTheDocument();
    expect(screen.getByText("Repository Distribution")).toBeInTheDocument();
    expect(screen.getByText("Language Distribution")).toBeInTheDocument();
  });
});
