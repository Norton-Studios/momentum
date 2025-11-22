import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Dashboard, { meta } from "./dashboard";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      user: { id: "1", email: "john@example.com", name: "John Doe", role: "USER" },
    }),
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
    expect(screen.getByText("↑ 2 this month")).toBeInTheDocument();

    expect(screen.getByText("Commits")).toBeInTheDocument();
    expect(screen.getByText("↓ 12% from last period")).toBeInTheDocument();

    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
    expect(screen.getByText("↓ 8% from last period")).toBeInTheDocument();
  });

  it("renders Delivery section with metric cards", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Delivery")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Deployment Velocity" })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Deployments this week")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "Commit & PR Activity" })).toBeInTheDocument();
    expect(screen.getByText("287")).toBeInTheDocument();
    expect(screen.getByText("Commits this week")).toBeInTheDocument();
  });

  it("renders Operational section with pipeline metrics", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Pipeline Success Rate" })).toBeInTheDocument();
    expect(screen.getByText("92.2%")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "Pipeline Duration" })).toBeInTheDocument();
    expect(screen.getByText("12.5m")).toBeInTheDocument();
  });

  it("renders Quality section with code coverage and security", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Quality")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Code Coverage" })).toBeInTheDocument();
    expect(screen.getByText("76%")).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "Security Vulnerabilities" })).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByText("Total vulnerabilities")).toBeInTheDocument();
  });

  it("renders security vulnerability severity breakdown", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
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

    expect(screen.getByText("2.1d")).toBeInTheDocument();
    expect(screen.getByText("Cycle Time")).toBeInTheDocument();
    expect(screen.getByText("3.5d")).toBeInTheDocument();
    expect(screen.getByText("Lead Time")).toBeInTheDocument();
    expect(screen.getByText("18h")).toBeInTheDocument();
    expect(screen.getByText("Time to Merge")).toBeInTheDocument();
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
    expect(screen.getByText("Open PRs")).toBeInTheDocument();
  });
});
