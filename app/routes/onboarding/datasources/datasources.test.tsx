import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import OnboardingDataSources, { meta } from "./datasources";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      user: { id: "1", email: "test@example.com", name: "Test User", role: "ADMIN" },
      connectedProviders: [],
      dataSourceConfigs: {},
    }),
    useActionData: () => undefined,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("OnboardingDataSources meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Connect Data Sources - Momentum" },
      {
        name: "description",
        content: "Connect your development tools to Momentum",
      },
    ]);
  });
});

describe("OnboardingDataSources", () => {
  it("renders logo", () => {
    const { container } = render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const logo = container.querySelector(".logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent("Momentum.");
  });

  it("renders progress indicator with all steps", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Data Sources")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("renders page header with title and description", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Connect Your Tools" })).toBeInTheDocument();
    expect(screen.getByText(/Momentum integrates with your existing development workflow. Connect at least one version control system/)).toBeInTheDocument();
  });

  it("renders Version Control section with required badge", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: /Version Control/ })).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders all version control data sources", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 3, name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByText(/Connect your GitHub organization to import repositories, commits, pull requests/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "GitLab" })).toBeInTheDocument();
    expect(screen.getByText(/Connect to GitLab \(cloud or self-hosted\) to track projects/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "Bitbucket" })).toBeInTheDocument();
    expect(screen.getByText(/Connect Bitbucket to import repositories, commits, and pull requests/)).toBeInTheDocument();
  });

  it("renders CI/CD Platforms section", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "CI/CD Platforms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Jenkins" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "CircleCI" })).toBeInTheDocument();
  });

  it("renders Code Quality section", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Code Quality" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "SonarQube" })).toBeInTheDocument();
  });

  it("renders connection status badges as Not Connected initially", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const statuses = screen.getAllByText("Not Connected");
    expect(statuses.length).toBeGreaterThan(0);
  });

  it("renders Configure buttons for all data sources", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Configure GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure GitLab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure Bitbucket" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure Jenkins" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure CircleCI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure SonarQube" })).toBeInTheDocument();
  });

  it("shows configuration form when Configure button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const configureButton = screen.getByRole("button", { name: "Configure GitHub" });
    await user.click(configureButton);

    expect(screen.getByLabelText(/Personal Access Token/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ghp_xxxxxxxxxxxx")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("my-organization")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test Connection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Configuration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("hides configuration form when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const configureButton = screen.getByRole("button", { name: "Configure GitHub" });
    await user.click(configureButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(screen.queryByLabelText(/Personal Access Token/)).not.toBeInTheDocument();
  });

  it("renders connection summary showing 0 of 1 initially", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText(/of 1 required connection established/)).toBeInTheDocument();
  });

  it("renders Continue button disabled initially", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const continueButton = screen.getByRole("button", { name: "Continue to Import" });
    expect(continueButton).toBeDisabled();
  });

  it("renders Skip for now link", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Skip for now" })).toHaveAttribute("href", "/dashboard");
  });
});
