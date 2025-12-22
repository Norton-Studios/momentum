import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingDataSources, { meta } from "./datasources";

const mockUseLoaderData = vi.fn();
const mockUseActionData = vi.fn();
const mockFetcherSubmit = vi.fn();
const mockUseFetcher = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => mockUseLoaderData(),
    useActionData: () => mockUseActionData(),
    useFetcher: () => mockUseFetcher(),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

// Mock scrollIntoView which isn't available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock the virtualizer - it doesn't render items without a real layout engine
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 60,
        size: 60,
        key: i,
      })),
    measureElement: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseLoaderData.mockReturnValue({
    user: { id: "1", email: "test@example.com", name: "Test User", role: "ADMIN" },
    connectedProviders: [],
    dataSourceConfigs: {},
  });
  mockUseActionData.mockReturnValue(undefined);
  mockUseFetcher.mockReturnValue({
    state: "idle",
    data: null,
    submit: mockFetcherSubmit,
  });
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

describe("OnboardingDataSources with connected providers", () => {
  beforeEach(() => {
    mockUseLoaderData.mockReturnValue({
      user: { id: "1", email: "test@example.com", name: "Test User", role: "ADMIN" },
      connectedProviders: ["github"],
      dataSourceConfigs: {
        github: { GITHUB_TOKEN: "ghp_test", GITHUB_ORG: "my-org" },
      },
    });
  });

  it("shows Connected status for connected providers", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const githubCard = document.getElementById("githubCard") as HTMLElement;
    expect(githubCard).toHaveClass("connected");
    expect(within(githubCard).getByText("Connected")).toBeInTheDocument();
  });

  it("shows Edit Configuration button for connected providers", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Edit GitHub Configuration" })).toBeInTheDocument();
  });

  it("enables Continue button when a required provider is connected", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const continueButton = screen.getByRole("button", { name: "Continue to Import" });
    expect(continueButton).not.toBeDisabled();
  });

  it("shows 1 of 1 required connections established", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const summary = screen.getByText(/of 1 required connection established/);
    expect(summary.parentElement).toHaveTextContent("1 of 1 required connection established");
  });

  it("populates form fields with existing config values", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Edit GitHub Configuration" }));

    const tokenInput = screen.getByLabelText(/Personal Access Token/);
    const orgInput = screen.getByLabelText(/Organization/);

    expect(tokenInput).toHaveValue("ghp_test");
    expect(orgInput).toHaveValue("my-org");
  });

  it("renders Repositories toggle button for VCS providers", () => {
    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /Repositories/ })).toBeInTheDocument();
  });
});

describe("OnboardingDataSources with fetcher data", () => {
  it("shows test success message", async () => {
    const user = userEvent.setup();
    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { testSuccess: true, provider: "github" },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Configure GitHub" }));

    expect(screen.getByText("Connection successful!")).toBeInTheDocument();
  });

  it("shows test error message", async () => {
    const user = userEvent.setup();
    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { testError: "Invalid token", provider: "github" },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Configure GitHub" }));

    expect(screen.getByText("Invalid token")).toBeInTheDocument();
  });

  it("adds provider to connected set on successful connection", () => {
    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { success: true, provider: "gitlab" },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    // When saveSuccess is true for gitlab, the card should have connected class
    const gitlabCard = document.getElementById("gitlabCard");
    expect(gitlabCard).toHaveClass("connected");
  });
});

describe("RepositoriesSection", () => {
  beforeEach(() => {
    mockUseLoaderData.mockReturnValue({
      user: { id: "1", email: "test@example.com", name: "Test User", role: "ADMIN" },
      connectedProviders: ["github"],
      dataSourceConfigs: {
        github: { GITHUB_TOKEN: "ghp_test", GITHUB_ORG: "my-org" },
      },
    });
  });

  it("fetches repositories when expanded", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(mockFetcherSubmit).toHaveBeenCalledWith(expect.any(FormData), { method: "post" });
  });

  it("shows loading state while fetching", async () => {
    const user = userEvent.setup();
    mockUseFetcher.mockReturnValue({
      state: "loading",
      data: null,
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(screen.getByText("Loading repositories...")).toBeInTheDocument();
  });

  it("renders repository list after loading", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      {
        id: "repo-1",
        name: "api",
        fullName: "org/api",
        description: "API service",
        language: "TypeScript",
        stars: 10,
        isPrivate: false,
        isEnabled: true,
        lastSyncAt: new Date("2024-01-15"),
      },
      {
        id: "repo-2",
        name: "web",
        fullName: "org/web",
        description: null,
        language: null,
        stars: 0,
        isPrivate: true,
        isEnabled: false,
        lastSyncAt: null,
      },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 2, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getByText("web")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("★ 10")).toBeInTheDocument();
  });

  it("shows selected count badge", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      { id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null },
      { id: "repo-2", name: "web", fullName: "org/web", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 2, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 repositories selected")).toBeInTheDocument();
  });

  it("filters repositories by search", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      { id: "repo-1", name: "api-service", fullName: "org/api-service", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null },
      { id: "repo-2", name: "web-app", fullName: "org/web-app", description: null, language: null, stars: 0, isPrivate: false, isEnabled: false, lastSyncAt: null },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 2, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));
    await user.type(screen.getByPlaceholderText("Search repositories..."), "api");

    expect(screen.getByText("api-service")).toBeInTheDocument();
    expect(screen.queryByText("web-app")).not.toBeInTheDocument();
  });

  it("toggles individual repository", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      { id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: false, lastSyncAt: null },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 1, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(mockFetcherSubmit).toHaveBeenCalledWith(expect.any(FormData), { method: "post" });
  });

  it("selects all visible repositories", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      { id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: false, lastSyncAt: null },
      { id: "repo-2", name: "web", fullName: "org/web", description: null, language: null, stars: 0, isPrivate: false, isEnabled: false, lastSyncAt: null },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 2, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));
    await user.click(screen.getByRole("button", { name: "Select All" }));

    expect(mockFetcherSubmit).toHaveBeenCalled();
  });

  it("deselects all visible repositories", async () => {
    const user = userEvent.setup();
    const mockRepositories = [
      { id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null },
      { id: "repo-2", name: "web", fullName: "org/web", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 2, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));
    await user.click(screen.getByRole("button", { name: "Deselect All" }));

    expect(mockFetcherSubmit).toHaveBeenCalled();
  });

  it("shows empty state when no repositories", async () => {
    const user = userEvent.setup();

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: [], totalCount: 0, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(screen.getByText("No repositories found")).toBeInTheDocument();
  });

  it("collapses repositories section when toggled again", async () => {
    const user = userEvent.setup();
    const mockRepositories = [{ id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: null }];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 1, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    const repoButton = screen.getByRole("button", { name: /Repositories/ });

    await user.click(repoButton);
    expect(screen.getByText("api")).toBeInTheDocument();

    await user.click(repoButton);
    expect(screen.queryByText("api")).not.toBeInTheDocument();
  });

  it("shows days ago for last activity", async () => {
    const user = userEvent.setup();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const mockRepositories = [
      { id: "repo-1", name: "api", fullName: "org/api", description: null, language: null, stars: 0, isPrivate: false, isEnabled: true, lastSyncAt: twoDaysAgo },
    ];

    mockUseFetcher.mockReturnValue({
      state: "idle",
      data: { repositories: mockRepositories, totalCount: 1, nextCursor: null },
      submit: mockFetcherSubmit,
    });

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Repositories/ }));

    expect(screen.getByText("Updated 2d ago")).toBeInTheDocument();
  });
});

describe("OnboardingDataSources form switching", () => {
  it("closes previous form when opening another", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingDataSources />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Configure GitHub" }));
    expect(screen.getByLabelText(/Personal Access Token/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Configure GitLab" }));

    expect(screen.queryByPlaceholderText("ghp_xxxxxxxxxxxx")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("glpat-xxxxxxxxxxxx")).toBeInTheDocument();
  });
});
