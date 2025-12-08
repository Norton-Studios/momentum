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
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    organization: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dataSource: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dataSourceConfig: {
      upsert: vi.fn(),
    },
    repository: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("~/lib/repositories/fetch-repositories", () => ({
  fetchGithubRepositories: vi.fn(),
  fetchGitlabRepositories: vi.fn(),
  saveRepositories: vi.fn(),
}));

vi.mock("~/lib/repositories/repository-filters", () => ({
  getRepositoriesWithFilters: vi.fn(),
}));

vi.mock("~/lib/repositories/toggle-repositories", () => ({
  toggleRepository: vi.fn(),
  toggleRepositoriesBatch: vi.fn(),
  DEFAULT_ACTIVE_THRESHOLD_DAYS: 90,
  REPOSITORY_PAGE_SIZE: 100,
}));

const mockOctokitGet = vi.hoisted(() => vi.fn());
const mockGitlabShowCurrentUser = vi.hoisted(() => vi.fn());

vi.mock("@octokit/rest", () => ({
  Octokit: class MockOctokit {
    orgs = { get: mockOctokitGet };
  },
}));

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class MockGitlab {
    Users = { showCurrentUser: mockGitlabShowCurrentUser };
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { fetchGithubRepositories, fetchGitlabRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";
import { datasourcesAction, extractConfigsFromForm, testConnection } from "./datasources.server";

describe("extractConfigsFromForm", () => {
  it("extracts GitHub config fields from FormData", () => {
    const formData = new FormData();
    formData.append("GITHUB_TOKEN", "ghp_test123");
    formData.append("GITHUB_ORG", "my-org");

    const result = extractConfigsFromForm(formData, "github");

    expect(result).toEqual({
      GITHUB_TOKEN: "ghp_test123",
      GITHUB_ORG: "my-org",
    });
  });

  it("ignores empty values", () => {
    const formData = new FormData();
    formData.append("GITHUB_TOKEN", "ghp_test123");
    formData.append("GITHUB_ORG", "");

    const result = extractConfigsFromForm(formData, "github");

    expect(result).toEqual({
      GITHUB_TOKEN: "ghp_test123",
    });
  });

  it("returns empty object for unknown provider", () => {
    const formData = new FormData();
    const result = extractConfigsFromForm(formData, "unknown");
    expect(result).toEqual({});
  });
});

describe("datasourcesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "test@example.com", name: "Test User", role: "ADMIN" } as never);
  });

  describe("connect intent", () => {
    it("creates organization and data source with config", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue(null);
      vi.mocked(db.organization.create).mockResolvedValue({ id: "org-1", name: "default", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
      vi.mocked(db.dataSource.create).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      await datasourcesAction({ request, params: {}, context: {} } as never);

      expect(db.organization.create).toHaveBeenCalled();
      expect(db.dataSource.create).toHaveBeenCalled();
      expect(db.dataSourceConfig.upsert).toHaveBeenCalledTimes(2);
    });

    it("updates existing data source", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      await datasourcesAction({ request, params: {}, context: {} } as never);

      expect(db.dataSource.update).toHaveBeenCalled();
      expect(db.dataSource.create).not.toHaveBeenCalled();
    });

    it("validates required fields", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      // Missing GITHUB_ORG

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      expect(db.dataSource.create).not.toHaveBeenCalled();
    });
  });

  describe("continue intent", () => {
    it("redirects to importing page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/onboarding/importing");
    });
  });

  describe("test intent", () => {
    beforeEach(() => {
      mockOctokitGet.mockReset();
      mockGitlabShowCurrentUser.mockReset();
    });

    it("returns success for valid GitHub connection", async () => {
      mockOctokitGet.mockResolvedValue({ data: { login: "my-org" } });

      const formData = new FormData();
      formData.append("intent", "test");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.testSuccess).toBe(true);
      expect(body.provider).toBe("github");
    });

    it("returns error for failed GitHub connection", async () => {
      mockOctokitGet.mockRejectedValue(new Error("Bad credentials"));

      const formData = new FormData();
      formData.append("intent", "test");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "invalid-token");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.testError).toBe("Bad credentials");
    });

    it("returns success for valid GitLab connection", async () => {
      mockGitlabShowCurrentUser.mockResolvedValue({ id: 1, username: "user" });

      const formData = new FormData();
      formData.append("intent", "test");
      formData.append("provider", "gitlab");
      formData.append("GITLAB_TOKEN", "glpat-test123");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.testSuccess).toBe(true);
    });

    it("returns error when GitHub token is missing", async () => {
      const formData = new FormData();
      formData.append("intent", "test");
      formData.append("provider", "github");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.testError).toBe("Token and organization are required");
    });
  });

  describe("fetch-repositories intent", () => {
    it("returns error for invalid provider", async () => {
      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "invalid");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid provider");
    });

    it("returns error when data source not found", async () => {
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "github");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Data source not found");
    });

    it("fetches and returns repositories", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITHUB",
        isEnabled: true,
        configs: [
          { key: "GITHUB_TOKEN", value: "ghp_test" },
          { key: "GITHUB_ORG", value: "my-org" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(10);
      vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
        repositories: [{ id: "repo-1", name: "api", fullName: "org/api" }],
        totalCount: 10,
        nextCursor: null,
      } as never);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "github");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.repositories).toHaveLength(1);
      expect(body.totalCount).toBe(10);
    });

    it("initializes repositories when none exist", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITHUB",
        isEnabled: true,
        configs: [
          { key: "GITHUB_TOKEN", value: "ghp_test" },
          { key: "GITHUB_ORG", value: "my-org" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(0);
      vi.mocked(fetchGithubRepositories).mockResolvedValue([]);
      vi.mocked(saveRepositories).mockResolvedValue(undefined);
      vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
        repositories: [],
        totalCount: 0,
        nextCursor: null,
      } as never);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "github");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(fetchGithubRepositories).toHaveBeenCalledWith({ token: "ghp_test", organization: "my-org" });
      expect(saveRepositories).toHaveBeenCalled();
    });

    it("returns error when repository fetch fails", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITHUB",
        isEnabled: true,
        configs: [
          { key: "GITHUB_TOKEN", value: "ghp_test" },
          { key: "GITHUB_ORG", value: "my-org" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(0);
      vi.mocked(fetchGithubRepositories).mockRejectedValue(new Error("API rate limit exceeded"));

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "github");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("API rate limit exceeded");
    });

    it("initializes GitLab repositories when none exist", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITLAB",
        isEnabled: true,
        configs: [{ key: "GITLAB_TOKEN", value: "glpat-test" }],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(0);
      vi.mocked(fetchGitlabRepositories).mockResolvedValue([]);
      vi.mocked(saveRepositories).mockResolvedValue(undefined);
      vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
        repositories: [],
        totalCount: 0,
        nextCursor: null,
      } as never);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "gitlab");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(fetchGitlabRepositories).toHaveBeenCalledWith({ token: "glpat-test", host: undefined });
    });

    it("returns error when GitHub config is missing", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITHUB",
        isEnabled: true,
        configs: [],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(0);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "github");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("GitHub token or organization not configured");
    });
  });

  describe("toggle-repository intent", () => {
    it("returns error when repositoryId is missing", async () => {
      const formData = new FormData();
      formData.append("intent", "toggle-repository");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Repository ID is required");
    });

    it("enables repository successfully", async () => {
      vi.mocked(toggleRepository).mockResolvedValue({ id: "repo-1", isEnabled: true } as never);

      const formData = new FormData();
      formData.append("intent", "toggle-repository");
      formData.append("repositoryId", "repo-1");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(toggleRepository).toHaveBeenCalledWith(db, "repo-1", true);
    });

    it("disables repository successfully", async () => {
      vi.mocked(toggleRepository).mockResolvedValue({ id: "repo-1", isEnabled: false } as never);

      const formData = new FormData();
      formData.append("intent", "toggle-repository");
      formData.append("repositoryId", "repo-1");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(toggleRepository).toHaveBeenCalledWith(db, "repo-1", false);
    });

    it("returns error when repository not found", async () => {
      vi.mocked(toggleRepository).mockRejectedValue(new Error("Repository not found"));

      const formData = new FormData();
      formData.append("intent", "toggle-repository");
      formData.append("repositoryId", "non-existent");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Repository not found");
    });
  });

  describe("toggle-repositories-batch intent", () => {
    it("enables multiple repositories", async () => {
      vi.mocked(toggleRepositoriesBatch).mockResolvedValue({ count: 3 });

      const formData = new FormData();
      formData.append("intent", "toggle-repositories-batch");
      formData.append("repositoryIds", "repo-1");
      formData.append("repositoryIds", "repo-2");
      formData.append("repositoryIds", "repo-3");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(3);
      expect(toggleRepositoriesBatch).toHaveBeenCalledWith(db, ["repo-1", "repo-2", "repo-3"], true);
    });

    it("disables multiple repositories", async () => {
      vi.mocked(toggleRepositoriesBatch).mockResolvedValue({ count: 2 });

      const formData = new FormData();
      formData.append("intent", "toggle-repositories-batch");
      formData.append("repositoryIds", "repo-1");
      formData.append("repositoryIds", "repo-2");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.count).toBe(2);
      expect(toggleRepositoriesBatch).toHaveBeenCalledWith(db, ["repo-1", "repo-2"], false);
    });

    it("handles empty repositoryIds array", async () => {
      vi.mocked(toggleRepositoriesBatch).mockResolvedValue({ count: 0 });

      const formData = new FormData();
      formData.append("intent", "toggle-repositories-batch");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.count).toBe(0);
    });
  });

  describe("invalid intent", () => {
    it("returns error for unknown intent", async () => {
      const formData = new FormData();
      formData.append("intent", "unknown");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors.form).toBe("Invalid action");
    });
  });
});

describe("testConnection", () => {
  beforeEach(() => {
    mockOctokitGet.mockReset();
    mockGitlabShowCurrentUser.mockReset();
  });

  it("returns error for unsupported provider", async () => {
    const result = await testConnection("bitbucket", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Test connection not implemented for this provider");
  });

  it("tests GitHub connection successfully", async () => {
    mockOctokitGet.mockResolvedValue({ data: { login: "my-org" } });

    const result = await testConnection("github", {
      GITHUB_TOKEN: "ghp_test",
      GITHUB_ORG: "my-org",
    });

    expect(result.success).toBe(true);
  });

  it("tests GitLab connection successfully", async () => {
    mockGitlabShowCurrentUser.mockResolvedValue({ id: 1 });

    const result = await testConnection("gitlab", {
      GITLAB_TOKEN: "glpat-test",
    });

    expect(result.success).toBe(true);
  });

  it("returns error when GitLab token is missing", async () => {
    const result = await testConnection("gitlab", {});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Token is required");
  });

  it("handles GitLab connection failure", async () => {
    mockGitlabShowCurrentUser.mockRejectedValue(new Error("Unauthorized"));

    const result = await testConnection("gitlab", {
      GITLAB_TOKEN: "invalid-token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });
});
