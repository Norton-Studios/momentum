import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: "user_1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
  }),
}));

const mockFetcherData = { testSuccess: false, testError: null, success: false, provider: null };
const mockFetcherSubmit = vi.fn();
const mockFetcher = {
  state: "idle",
  data: mockFetcherData,
  submit: mockFetcherSubmit,
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useFetcher: () => mockFetcher,
  };
});

const mockLoaderData = {
  dataSources: [
    {
      id: "ds_1",
      provider: "GITHUB",
      name: "GitHub Integration",
      isEnabled: true,
      lastSyncAt: new Date("2025-12-23T10:00:00Z"),
      configs: [
        { key: "GITHUB_TOKEN", value: "test_token", isSecret: true },
        { key: "GITHUB_ORG", value: "test-org", isSecret: false },
      ],
      _count: {
        runs: 5,
      },
    },
    {
      id: "ds_2",
      provider: "JIRA",
      name: "Jira Integration",
      isEnabled: true,
      lastSyncAt: null,
      configs: [{ key: "JIRA_TOKEN", value: "test_token", isSecret: true }],
      _count: {
        runs: 0,
      },
    },
  ],
  user: { name: "Test User", email: "test@example.com" },
};

describe("DataSourcesSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetcher.state = "idle";
    mockFetcher.data = mockFetcherData;
  });

  it("renders data source sections", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Version Control")).toBeInTheDocument();
    });

    expect(screen.getByText("CI/CD Platforms")).toBeInTheDocument();
    expect(screen.getByText("Code Quality")).toBeInTheDocument();
    expect(screen.getByText("Project Management")).toBeInTheDocument();
  });

  it("renders all data source cards", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });

    expect(screen.getByText("GitLab")).toBeInTheDocument();
    expect(screen.getByText("Jenkins")).toBeInTheDocument();
    expect(screen.getByText("CircleCI")).toBeInTheDocument();
    expect(screen.getByText("SonarQube")).toBeInTheDocument();
    expect(screen.getByText("Jira")).toBeInTheDocument();
  });

  it("shows configure buttons for each data source", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Edit GitHub Configuration")).toBeInTheDocument();
    });

    expect(screen.getByText("Configure GitLab")).toBeInTheDocument();
    expect(screen.getByText("Configure Jenkins")).toBeInTheDocument();
  });

  it("shows connected status for configured data sources", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });

    const connectedBadges = screen.getAllByText("Connected");
    expect(connectedBadges.length).toBe(2); // GitHub and Jira

    const notConnectedBadges = screen.getAllByText("Not Connected");
    expect(notConnectedBadges.length).toBe(4); // GitLab, Jenkins, CircleCI, SonarQube
  });

  it("opens configuration form when configure button clicked", async () => {
    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitLab")).toBeInTheDocument();
    });

    const configureButton = screen.getByText("Configure GitLab");
    await user.click(configureButton);

    await waitFor(() => {
      expect(screen.getByText("Test Connection")).toBeInTheDocument();
      expect(screen.getByText("Save Configuration")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("renders all sources as not connected when no data sources configured", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [], user: { name: "Test User", email: "test@example.com" } }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Version Control")).toBeInTheDocument();
    });

    const notConnectedBadges = screen.getAllByText("Not Connected");
    expect(notConnectedBadges.length).toBe(6);
  });

  it("closes form when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitLab")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Configure GitLab"));

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Test Connection")).not.toBeInTheDocument();
    });
  });

  it("pre-populates form with existing config values for connected data source", async () => {
    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Edit GitHub Configuration")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit GitHub Configuration"));

    await waitFor(() => {
      const orgInput = screen.getByLabelText(/organization/i) as HTMLInputElement;
      expect(orgInput.value).toBe("test-org");
    });
  });

  it("shows test success message when connection test succeeds", async () => {
    mockFetcher.data = { testSuccess: true, provider: "github" };

    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Edit GitHub Configuration")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Edit GitHub Configuration"));

    await waitFor(() => {
      expect(screen.getByText("Connection successful!")).toBeInTheDocument();
    });

    mockFetcher.data = mockFetcherData;
  });

  it("shows test error message when connection test fails", async () => {
    mockFetcher.data = { testError: "Invalid credentials", provider: "gitlab" };

    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [], user: { name: "Test User", email: "test@example.com" } }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitLab")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Configure GitLab"));

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
    });

    mockFetcher.data = mockFetcherData;
  });

  it("disables buttons while form is submitting", async () => {
    mockFetcher.state = "submitting";

    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [], user: { name: "Test User", email: "test@example.com" } }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitLab")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Configure GitLab"));

    await waitFor(() => {
      expect(screen.getByText("Testing...")).toBeInTheDocument();
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    mockFetcher.state = "idle";
  });

  it("shows repositories section for connected VCS data source", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });

    const repositoriesToggle = screen.getByRole("button", { name: /Repositories/i });
    expect(repositoriesToggle).toBeInTheDocument();
  });

  it("shows projects section for connected Jira data source", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Jira")).toBeInTheDocument();
    });

    const projectsToggle = screen.getByRole("button", { name: /Projects/i });
    expect(projectsToggle).toBeInTheDocument();
  });

  it("expands repositories section when toggle is clicked", async () => {
    const user = userEvent.setup();

    mockFetcher.data = {
      repositories: [
        {
          id: "repo-1",
          name: "test-repo",
          fullName: "org/test-repo",
          description: null,
          language: "TypeScript",
          stars: 10,
          isPrivate: false,
          isEnabled: true,
          lastSyncAt: new Date(),
        },
      ],
      totalCount: 1,
      nextCursor: undefined,
    };

    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });

    const repositoriesToggle = screen.getByRole("button", { name: /Repositories/i });
    await user.click(repositoriesToggle);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search repositories...")).toBeInTheDocument();
    });

    mockFetcher.data = mockFetcherData;
  });

  it("shows select all and deselect all buttons in repositories section", async () => {
    const user = userEvent.setup();

    mockFetcher.data = {
      repositories: [
        {
          id: "repo-1",
          name: "test-repo",
          fullName: "org/test-repo",
          description: null,
          language: "TypeScript",
          stars: 10,
          isPrivate: false,
          isEnabled: true,
          lastSyncAt: new Date(),
        },
      ],
      totalCount: 1,
      nextCursor: undefined,
    };

    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
    });

    const repositoriesToggle = screen.getByRole("button", { name: /Repositories/i });
    await user.click(repositoriesToggle);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Select All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Deselect All" })).toBeInTheDocument();
    });

    mockFetcher.data = mockFetcherData;
  });

  it("submits form data when Test Connection is clicked", async () => {
    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [], user: { name: "Test User", email: "test@example.com" } }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitHub")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Configure GitHub"));

    await waitFor(() => {
      expect(screen.getByText("Test Connection")).toBeInTheDocument();
    });

    const tokenInput = screen.getByLabelText(/Personal Access Token/i);
    const orgInput = screen.getByLabelText(/Organization/i);

    await user.type(tokenInput, "test-token");
    await user.type(orgInput, "test-org");

    await user.click(screen.getByText("Test Connection"));

    expect(mockFetcherSubmit).toHaveBeenCalled();
  });

  it("submits form data when Save Configuration is clicked", async () => {
    const user = userEvent.setup();
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [], user: { name: "Test User", email: "test@example.com" } }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Configure GitHub")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Configure GitHub"));

    await waitFor(() => {
      expect(screen.getByText("Save Configuration")).toBeInTheDocument();
    });

    const tokenInput = screen.getByLabelText(/Personal Access Token/i);
    const orgInput = screen.getByLabelText(/Organization/i);

    await user.type(tokenInput, "test-token");
    await user.type(orgInput, "test-org");

    await user.click(screen.getByText("Save Configuration"));

    expect(mockFetcherSubmit).toHaveBeenCalled();
  });

  it("expands projects section when toggle is clicked", async () => {
    const user = userEvent.setup();

    mockFetcher.data = {
      projects: [{ id: "proj-1", name: "Test Project", key: "TP", isEnabled: true }],
    };

    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => mockLoaderData,
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Jira")).toBeInTheDocument();
    });

    const projectsToggle = screen.getByRole("button", { name: /Projects/i });
    await user.click(projectsToggle);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search projects...")).toBeInTheDocument();
    });

    mockFetcher.data = mockFetcherData;
  });
});
