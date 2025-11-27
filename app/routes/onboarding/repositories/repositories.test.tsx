import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Repositories from "./repositories";

const mockFetcher = {
  state: "idle" as const,
  data: null as unknown,
  submit: vi.fn(),
  load: vi.fn(),
};

const mockSetSearchParams = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useNavigation: () => ({ state: "idle" }),
    useFetcher: () => mockFetcher,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 70,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 10) }, (_, i) => ({
        index: i,
        start: i * 70,
        size: 70,
        key: i,
      })),
    measureElement: vi.fn(),
  }),
}));

import { useLoaderData } from "react-router";

const createMockRepository = (
  overrides: Partial<{
    id: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    isPrivate: boolean;
    isEnabled: boolean;
    lastSyncAt: Date | null;
  }> = {}
) => ({
  id: "repo-1",
  name: "api",
  fullName: "org/api",
  description: "API service",
  language: "TypeScript",
  stars: 10,
  isPrivate: false,
  isEnabled: true,
  lastSyncAt: new Date("2024-01-15"),
  ...overrides,
});

const createSuccessData = (
  overrides: Partial<{
    repositories: ReturnType<typeof createMockRepository>[];
    totalCount: number;
    nextCursor: string | undefined;
    filters: { search: string | undefined; activity: string };
  }> = {}
) => ({
  repositories: [createMockRepository()],
  totalCount: 1,
  nextCursor: undefined,
  filters: { search: undefined, activity: "all" },
  ...overrides,
});

describe("Repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetcher.state = "idle";
    mockFetcher.data = null;
  });

  describe("Error state", () => {
    it("renders error view when loader returns error", () => {
      vi.mocked(useLoaderData).mockReturnValue({ error: "No VCS data source configured" });

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { level: 2, name: "Error" })).toBeInTheDocument();
      expect(screen.getByText("No VCS data source configured")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Back to Data Sources" })).toHaveAttribute("href", "/onboarding/datasources");
    });
  });

  describe("Success state", () => {
    it("renders page header", () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByRole("heading", { level: 1, name: "Select Repositories" })).toBeInTheDocument();
      expect(screen.getByText(/Choose which repositories you want to monitor/)).toBeInTheDocument();
    });

    it("renders search input", () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByPlaceholderText("Search repositories...")).toBeInTheDocument();
    });

    it("renders Select All and Deselect All buttons", () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: "Select All" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Deselect All" })).toBeInTheDocument();
    });

    it("renders repository list", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", name: "api" }), createMockRepository({ id: "repo-2", name: "web" })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("api")).toBeInTheDocument();
      expect(screen.getByText("web")).toBeInTheDocument();
    });

    it("renders repository metadata", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ language: "TypeScript", stars: 42, isPrivate: true })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Private")).toBeInTheDocument();
      expect(screen.getByText(/★ 42/)).toBeInTheDocument();
    });

    it("renders selection count in footer", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ isEnabled: true }), createMockRepository({ id: "repo-2", isEnabled: false })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText(/of/)).toBeInTheDocument();
      expect(screen.getByText(/repositories selected/)).toBeInTheDocument();
    });

    it("renders Back link and Continue button", () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/onboarding/datasources");
      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });

    it("renders last active time for repositories", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ lastSyncAt: twoDaysAgo })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText(/Updated 2d ago/)).toBeInTheDocument();
    });
  });

  describe("User interactions", () => {
    it("updates search input value", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText("Search repositories...");
      await user.type(searchInput, "api");

      expect(searchInput).toHaveValue("api");
    });

    it("submits toggle form when checkbox is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      // Get all checkboxes - first is header, rest are repository checkboxes
      const checkboxes = screen.getAllByRole("checkbox");
      const repositoryCheckbox = checkboxes[1]; // Skip header checkbox
      await user.click(repositoryCheckbox);

      expect(mockFetcher.submit).toHaveBeenCalledWith(expect.any(FormData), { method: "post" });
    });

    it("submits select-all-matching form when Select All is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const selectAllButton = screen.getByRole("button", { name: "Select All" });
      await user.click(selectAllButton);

      expect(mockFetcher.submit).toHaveBeenCalled();
      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("select-all-matching");
      expect(formData.get("isEnabled")).toBe("true");
    });

    it("submits deselect form when Deselect All is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const deselectAllButton = screen.getByRole("button", { name: "Deselect All" });
      await user.click(deselectAllButton);

      expect(mockFetcher.submit).toHaveBeenCalled();
      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("select-all-matching");
      expect(formData.get("isEnabled")).toBe("false");
    });

    it("toggles header checkbox state based on visible selection", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true }), createMockRepository({ id: "repo-2", name: "web", isEnabled: true })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const headerCheckbox = screen.getAllByRole("checkbox")[0];
      expect(headerCheckbox).toBeChecked();

      await user.click(headerCheckbox);
      expect(mockFetcher.submit).toHaveBeenCalled();
    });
  });

  describe("Selected count display", () => {
    it("shows correct selected count from enabled repositories", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [
            createMockRepository({ id: "repo-1", isEnabled: true }),
            createMockRepository({ id: "repo-2", name: "web", isEnabled: false }),
            createMockRepository({ id: "repo-3", name: "cli", isEnabled: true }),
          ],
          totalCount: 3,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });
  });

  describe("Fetcher data handling", () => {
    it("updates selection when fetcher returns repositoryIds", async () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData({ repositories: [createMockRepository({ id: "repo-1", isEnabled: false })] }));

      const { rerender } = render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      mockFetcher.data = { repositoryIds: ["repo-1", "repo-2"], count: 2 };

      rerender(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });
    });
  });

  describe("Repository without metadata", () => {
    it("renders repository without language, stars, or last sync", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ language: null, stars: 0, isPrivate: false, lastSyncAt: null })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("api")).toBeInTheDocument();
      expect(screen.queryByText("Private")).not.toBeInTheDocument();
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    });
  });

  describe("Toggle repository selection", () => {
    it("deselects repository when clicking checked checkbox", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const checkboxes = screen.getAllByRole("checkbox");
      const repositoryCheckbox = checkboxes[1];
      expect(repositoryCheckbox).toBeChecked();

      await user.click(repositoryCheckbox);

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("toggle");
      expect(formData.get("repositoryId")).toBe("repo-1");
      expect(formData.get("isEnabled")).toBe("false");
    });

    it("selects repository when clicking unchecked checkbox", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: false })],
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const checkboxes = screen.getAllByRole("checkbox");
      const repositoryCheckbox = checkboxes[1];
      expect(repositoryCheckbox).not.toBeChecked();

      await user.click(repositoryCheckbox);

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("toggle");
      expect(formData.get("isEnabled")).toBe("true");
    });
  });

  describe("Header checkbox behavior", () => {
    it("shows indeterminate state when some repositories selected", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true }), createMockRepository({ id: "repo-2", name: "web", isEnabled: false })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const headerCheckbox = screen.getAllByRole("checkbox")[0] as HTMLInputElement;
      expect(headerCheckbox.indeterminate).toBe(true);
    });

    it("deselects all visible when header checkbox is clicked while all selected", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true }), createMockRepository({ id: "repo-2", name: "web", isEnabled: true })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const headerCheckbox = screen.getAllByRole("checkbox")[0];
      await user.click(headerCheckbox);

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("toggle-batch");
      expect(formData.get("isEnabled")).toBe("false");
    });

    it("selects all visible when header checkbox is clicked while none selected", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: false }), createMockRepository({ id: "repo-2", name: "web", isEnabled: false })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const headerCheckbox = screen.getAllByRole("checkbox")[0];
      await user.click(headerCheckbox);

      const formData = mockFetcher.submit.mock.calls[0][0] as FormData;
      expect(formData.get("intent")).toBe("toggle-batch");
      expect(formData.get("isEnabled")).toBe("true");
      expect(formData.getAll("repositoryIds")).toEqual(["repo-1", "repo-2"]);
    });
  });

  describe("Fetcher error handling", () => {
    it("handles fetcher error response", async () => {
      vi.mocked(useLoaderData).mockReturnValue(createSuccessData());

      const { rerender } = render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      mockFetcher.data = { error: "Failed to update" };

      rerender(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      // Component should still render without crashing
      expect(screen.getByRole("heading", { level: 1, name: "Select Repositories" })).toBeInTheDocument();
    });
  });

  describe("Pagination with nextCursor", () => {
    it("displays data with nextCursor available", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository()],
          totalCount: 100,
          nextCursor: "cursor-123",
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("api")).toBeInTheDocument();
    });
  });

  describe("Fetcher loading repositories", () => {
    it("appends new repositories from fetcher load response", async () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", name: "api" })],
          totalCount: 2,
          nextCursor: "cursor-1",
        })
      );

      const { rerender } = render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      // Simulate loading more with fetcher data
      mockFetcher.data = {
        repositories: [createMockRepository({ id: "repo-2", name: "web", isEnabled: true })],
        nextCursor: undefined,
      };

      rerender(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("api")).toBeInTheDocument();
      });
    });
  });

  describe("Search with initial filter", () => {
    it("initializes search input with filter value from loader", () => {
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          filters: { search: "initial-search", activity: "all" },
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText("Search repositories...");
      expect(searchInput).toHaveValue("initial-search");
    });
  });

  describe("Select All behavior", () => {
    it("clears selections when Deselect All is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: true }), createMockRepository({ id: "repo-2", name: "web", isEnabled: true })],
          totalCount: 2,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();

      const deselectAllButton = screen.getByRole("button", { name: "Deselect All" });
      await user.click(deselectAllButton);

      await waitFor(() => {
        expect(screen.getByText("0 selected")).toBeInTheDocument();
      });
    });

    it("shows total count when Select All is clicked", async () => {
      const user = userEvent.setup();
      vi.mocked(useLoaderData).mockReturnValue(
        createSuccessData({
          repositories: [createMockRepository({ id: "repo-1", isEnabled: false })],
          totalCount: 100,
        })
      );

      render(
        <MemoryRouter>
          <Repositories />
        </MemoryRouter>
      );

      const selectAllButton = screen.getByRole("button", { name: "Select All" });
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByText("100 selected")).toBeInTheDocument();
      });
    });
  });
});
