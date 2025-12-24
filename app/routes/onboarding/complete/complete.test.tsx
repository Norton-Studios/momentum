import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Complete from "./complete";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      organization: { name: "My Organization" },
      dataSources: [
        { provider: "GITHUB", name: "my-org" },
        { provider: "GITLAB", name: "my-group" },
      ],
      summary: {
        repositories: 25,
        commits: 1500,
        pullRequests: 200,
        contributors: 15,
      },
    }),
  };
});

describe("Complete", () => {
  it("renders page title", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "You're All Set" })).toBeInTheDocument();
  });

  it("renders completion message", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByText(/Momentum is now collecting data from your development tools/)).toBeInTheDocument();
  });

  it("renders connected data sources section", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Connected Data Sources" })).toBeInTheDocument();
    expect(screen.getByText("GITHUB")).toBeInTheDocument();
    expect(screen.getByText("my-org")).toBeInTheDocument();
    expect(screen.getByText("GITLAB")).toBeInTheDocument();
    expect(screen.getByText("my-group")).toBeInTheDocument();
  });

  it("renders data collection summary section", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Data Collection Summary" })).toBeInTheDocument();
  });

  it("renders repository count", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Repositories")).toBeInTheDocument();
  });

  it("renders commit count", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(screen.getByText("Commits")).toBeInTheDocument();
  });

  it("renders pull request count", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("Pull Requests")).toBeInTheDocument();
  });

  it("renders contributor count", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Contributors")).toBeInTheDocument();
  });

  it("renders next steps section", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Next Steps" })).toBeInTheDocument();
    expect(screen.getByText(/Explore your organization metrics/)).toBeInTheDocument();
    expect(screen.getByText(/View individual contributor metrics/)).toBeInTheDocument();
    expect(screen.getByText(/Configure additional data sources/)).toBeInTheDocument();
    expect(screen.getByText(/Invite team members/)).toBeInTheDocument();
  });

  it("renders Go to Dashboard button", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(dashboardLink.querySelector("button")).toHaveClass("btn-primary");
  });

  it("renders Add More Sources link", () => {
    render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    const addSourcesLink = screen.getByRole("link", { name: "Add More Sources" });
    expect(addSourcesLink).toHaveAttribute("href", "/onboarding/datasources");
  });

  it("renders within onboarding layout", () => {
    const { container } = render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    expect(container.querySelector(".onboarding-header")).toBeInTheDocument();
    expect(container.querySelector(".onboarding-main")).toBeInTheDocument();
  });

  it("renders progress indicator with step 4 active", () => {
    const { container } = render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    const progressSteps = container.querySelectorAll(".progress-step");
    expect(progressSteps).toHaveLength(4);
    expect(progressSteps[0]).toHaveClass("completed");
    expect(progressSteps[1]).toHaveClass("completed");
    expect(progressSteps[2]).toHaveClass("completed");
    expect(progressSteps[3]).toHaveClass("active");
  });

  it("renders connection summary", () => {
    const { container } = render(
      <MemoryRouter>
        <Complete />
      </MemoryRouter>
    );

    const connectionSummary = container.querySelector(".connection-summary");
    expect(connectionSummary).toBeInTheDocument();
    expect(connectionSummary?.textContent).toContain("2");
    expect(connectionSummary?.textContent).toContain("data source");
  });
});

describe("Complete with empty data", () => {
  it("renders with zero counts", () => {
    vi.doMock("react-router", async () => {
      const actual = await vi.importActual("react-router");
      return {
        ...actual,
        useLoaderData: () => ({
          organization: { name: "Empty Org" },
          dataSources: [],
          summary: {
            repositories: 0,
            commits: 0,
            pullRequests: 0,
            contributors: 0,
          },
        }),
      };
    });
  });
});
