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
      provider: "GITLAB",
      name: "GitLab Integration",
      isEnabled: false,
      lastSyncAt: null,
      configs: [{ key: "GITLAB_TOKEN", value: "test_token", isSecret: true }],
      _count: {
        runs: 0,
      },
    },
  ],
};

describe("DataSourcesSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders data sources list", async () => {
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
      expect(screen.getByText("Connect and manage your development tools and platforms")).toBeInTheDocument();
    });

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("GitLab")).toBeInTheDocument();
    expect(screen.getByText("5 runs")).toBeInTheDocument();
  });

  it("shows add data source button", async () => {
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
      expect(screen.getByText("Add Data Source")).toBeInTheDocument();
    });
  });

  it("shows provider selection when add data source clicked", async () => {
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
      expect(screen.getByText("Add Data Source")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Data Source");
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Select a Data Source")).toBeInTheDocument();
    });

    expect(screen.getByText("Jenkins")).toBeInTheDocument();
    expect(screen.getByText("CircleCI")).toBeInTheDocument();
    expect(screen.getByText("SonarQube")).toBeInTheDocument();
    expect(screen.getByText("Jira")).toBeInTheDocument();
  });

  it("displays enabled/disabled state correctly", async () => {
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

    const toggles = screen.getAllByRole("checkbox");
    expect(toggles[0]).toBeChecked();
    expect(toggles[1]).not.toBeChecked();
  });

  it("shows last sync timestamp when available", async () => {
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
      expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
    });
  });

  it("renders empty state when no data sources", async () => {
    const DataSourcesPage = await import("./data-sources");

    const router = createMemoryRouter(
      [
        {
          path: "/settings/data-sources",
          element: <DataSourcesPage.default />,
          loader: () => ({ dataSources: [] }),
        },
      ],
      {
        initialEntries: ["/settings/data-sources"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText("Add Data Source")).toBeInTheDocument();
    });

    expect(screen.getByText("Connect and manage your development tools and platforms")).toBeInTheDocument();
  });
});
