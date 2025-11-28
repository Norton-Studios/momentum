import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    dataSource: {
      findFirst: vi.fn(),
    },
    repository: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("~/lib/repositories/fetch-repositories", () => ({
  fetchGithubRepositories: vi.fn(),
  saveRepositories: vi.fn(),
}));

// Suppress console.log during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

vi.mock("~/lib/repositories/repository-filters", () => ({
  getRepositoriesWithFilters: vi.fn(),
  bulkUpdateRepositorySelection: vi.fn(),
  selectAllMatchingFilters: vi.fn(),
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { fetchGithubRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { bulkUpdateRepositorySelection, getRepositoriesWithFilters, selectAllMatchingFilters } from "~/lib/repositories/repository-filters";
import { repositoriesAction, repositoriesLoader } from "./repositories.server";

describe("repositoriesLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns error when no VCS data source is configured", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/onboarding/repositories");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No VCS data source configured");
  });

  it("returns repositories when data source exists and has repositories", async () => {
    const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }] as never);
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [
        { id: "repo-1", name: "api", fullName: "org/api", description: null, language: "TypeScript", stars: 10, isPrivate: false, isEnabled: true, lastSyncAt: new Date() },
      ],
      totalCount: 1,
      nextCursor: undefined,
    });

    const request = new Request("http://localhost/onboarding/repositories");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.repositories).toHaveLength(1);
    expect(body.totalCount).toBe(1);
  });

  it("parses search and activity filters from URL", async () => {
    const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }] as never);
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      nextCursor: undefined,
    });

    const request = new Request("http://localhost/onboarding/repositories?search=api&activity=active&cursor=repo-50");
    await repositoriesLoader({ request, params: {}, context: {} });

    expect(getRepositoriesWithFilters).toHaveBeenCalledWith(db, "ds-1", {
      search: "api",
      activity: "active",
      cursor: "repo-50",
      limit: 100,
    });
  });

  it("initializes repositories when none exist and redirects", async () => {
    const mockDataSource = {
      id: "ds-1",
      provider: "GITHUB",
      configs: [
        { key: "GITHUB_TOKEN", value: "ghp_test" },
        { key: "GITHUB_ORG", value: "my-org" },
      ],
    };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]); // No repositories
    vi.mocked(fetchGithubRepositories).mockResolvedValue([{ name: "repo-1", fullName: "org/repo-1" }] as never);
    vi.mocked(saveRepositories).mockResolvedValue(undefined);
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 1 });

    const request = new Request("http://localhost/onboarding/repositories");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/onboarding/repositories?initialized=true");
    expect(fetchGithubRepositories).toHaveBeenCalledWith({ token: "ghp_test", organization: "my-org" });
    expect(saveRepositories).toHaveBeenCalled();
  });

  it("returns error when GitHub token or org is missing", async () => {
    const mockDataSource = {
      id: "ds-1",
      provider: "GITHUB",
      configs: [{ key: "GITHUB_TOKEN", value: "ghp_test" }], // Missing GITHUB_ORG
    };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/onboarding/repositories");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("GitHub token or organization not configured");
  });

  it("returns error when initialization fails", async () => {
    const mockDataSource = {
      id: "ds-1",
      provider: "GITHUB",
      configs: [
        { key: "GITHUB_TOKEN", value: "ghp_test" },
        { key: "GITHUB_ORG", value: "my-org" },
      ],
    };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(fetchGithubRepositories).mockRejectedValue(new Error("API rate limit exceeded"));

    const request = new Request("http://localhost/onboarding/repositories");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("API rate limit exceeded");
  });

  it("skips initialization when already initialized", async () => {
    const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [],
      totalCount: 0,
      nextCursor: undefined,
    });

    const request = new Request("http://localhost/onboarding/repositories?initialized=true");
    const response = await repositoriesLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(200);
    expect(fetchGithubRepositories).not.toHaveBeenCalled();
  });
});

describe("repositoriesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  describe("toggle intent", () => {
    it("toggles repository enabled state", async () => {
      vi.mocked(db.repository.update).mockResolvedValue({ id: "repo-1", isEnabled: true } as never);

      const formData = new FormData();
      formData.append("intent", "toggle");
      formData.append("repositoryId", "repo-1");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      expect(db.repository.update).toHaveBeenCalledWith({
        where: { id: "repo-1" },
        data: { isEnabled: true },
      });
    });

    it("disables repository when isEnabled is false", async () => {
      vi.mocked(db.repository.update).mockResolvedValue({ id: "repo-1", isEnabled: false } as never);

      const formData = new FormData();
      formData.append("intent", "toggle");
      formData.append("repositoryId", "repo-1");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      await repositoriesAction({ request, params: {}, context: {} });

      expect(db.repository.update).toHaveBeenCalledWith({
        where: { id: "repo-1" },
        data: { isEnabled: false },
      });
    });
  });

  describe("bulk-select intent", () => {
    it("bulk updates multiple repository selections", async () => {
      vi.mocked(bulkUpdateRepositorySelection).mockResolvedValue(3);

      const formData = new FormData();
      formData.append("intent", "bulk-select");
      formData.append("repositoryIds", "repo-1");
      formData.append("repositoryIds", "repo-2");
      formData.append("repositoryIds", "repo-3");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      expect(bulkUpdateRepositorySelection).toHaveBeenCalledWith(db, ["repo-1", "repo-2", "repo-3"], true);
    });
  });

  describe("select-all-matching intent", () => {
    it("selects all repositories matching filters", async () => {
      const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(selectAllMatchingFilters).mockResolvedValue(50);
      vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }, { id: "repo-2" }] as never);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("search", "api");
      formData.append("activity", "active");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(50);
      expect(body.repositoryIds).toEqual(["repo-1", "repo-2"]);
    });

    it("returns empty repositoryIds when deselecting all", async () => {
      const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(selectAllMatchingFilters).mockResolvedValue(50);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.repositoryIds).toEqual([]);
    });

    it("returns error when no VCS data source", async () => {
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("No VCS data source configured");
    });

    it("applies stale activity filter when selecting all", async () => {
      const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(selectAllMatchingFilters).mockResolvedValue(10);
      vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }] as never);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("activity", "stale");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      expect(selectAllMatchingFilters).toHaveBeenCalledWith(db, "ds-1", expect.objectContaining({ activity: "stale" }), true);
    });

    it("applies inactive activity filter when selecting all", async () => {
      const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(selectAllMatchingFilters).mockResolvedValue(5);
      vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }] as never);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("activity", "inactive");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      expect(selectAllMatchingFilters).toHaveBeenCalledWith(db, "ds-1", expect.objectContaining({ activity: "inactive" }), true);
    });

    it("handles languages filter in select-all-matching", async () => {
      const mockDataSource = { id: "ds-1", provider: "GITHUB", configs: [] };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(selectAllMatchingFilters).mockResolvedValue(20);
      vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1" }] as never);

      const formData = new FormData();
      formData.append("intent", "select-all-matching");
      formData.append("languages", "TypeScript");
      formData.append("languages", "JavaScript");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(200);
      expect(selectAllMatchingFilters).toHaveBeenCalledWith(db, "ds-1", expect.objectContaining({ languages: ["TypeScript", "JavaScript"] }), true);
    });
  });

  describe("continue intent", () => {
    it("redirects to importing page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/onboarding/importing");
    });
  });

  describe("invalid intent", () => {
    it("returns error for unknown intent", async () => {
      const formData = new FormData();
      formData.append("intent", "unknown");

      const request = new Request("http://localhost/onboarding/repositories", {
        method: "POST",
        body: formData,
      });

      const response = await repositoriesAction({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid intent");
    });
  });
});
