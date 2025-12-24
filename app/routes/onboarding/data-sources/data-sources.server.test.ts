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
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
import { datasourcesAction, extractConfigsFromForm, testConnection } from "./data-sources.server";

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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      expect(db.dataSource.create).not.toHaveBeenCalled();
    });

    it("returns error when provider is missing", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors.provider).toBe("Provider is required");
    });

    it("returns error for invalid provider", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "invalid-provider");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors.provider).toBe("Invalid provider");
    });

    it("validates Jira Cloud required fields with showWhen conditions", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "jira");
      formData.append("JIRA_VARIANT", "cloud");
      formData.append("JIRA_DOMAIN", "my-company");
      // Missing JIRA_EMAIL and JIRA_API_TOKEN

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors.JIRA_EMAIL).toBe("Email is required");
    });

    it("skips datacenter fields when cloud variant is selected", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
      vi.mocked(db.dataSource.create).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "jira");
      formData.append("JIRA_VARIANT", "cloud");
      formData.append("JIRA_DOMAIN", "my-company");
      formData.append("JIRA_EMAIL", "user@example.com");
      formData.append("JIRA_API_TOKEN", "token123");
      // Not providing JIRA_SERVER_URL or JIRA_PAT should be fine

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
    });

    it("validates Jira Data Center required fields", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "jira");
      formData.append("JIRA_VARIANT", "datacenter");
      formData.append("JIRA_SERVER_URL", "https://jira.company.com");
      // Missing JIRA_PAT

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.errors.JIRA_PAT).toBe("Personal Access Token is required");
    });

    it("connects GitLab with custom host", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
      vi.mocked(db.dataSource.create).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "gitlab");
      formData.append("GITLAB_TOKEN", "glpat-test123");
      formData.append("GITLAB_HOST", "https://gitlab.company.com");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(db.dataSourceConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ key: "GITLAB_HOST", value: "https://gitlab.company.com" }),
        })
      );
    });
  });

  describe("continue intent", () => {
    it("redirects to importing page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(fetchGitlabRepositories).toHaveBeenCalledWith({ token: "glpat-test", host: undefined });
    });

    it("initializes GitLab repositories with custom host", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITLAB",
        isEnabled: true,
        configs: [
          { key: "GITLAB_TOKEN", value: "glpat-test" },
          { key: "GITLAB_HOST", value: "https://gitlab.company.com" },
        ],
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

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(fetchGitlabRepositories).toHaveBeenCalledWith({ token: "glpat-test", host: "https://gitlab.company.com" });
    });

    it("returns error when GitLab token is missing", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "GITLAB",
        isEnabled: true,
        configs: [],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.repository.count).mockResolvedValue(0);

      const formData = new FormData();
      formData.append("intent", "fetch-repositories");
      formData.append("provider", "gitlab");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("GitLab token not configured");
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.count).toBe(0);
    });
  });

  describe("fetch-projects intent", () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it("returns error for invalid provider", async () => {
      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", "invalid");

      const request = new Request("http://localhost/onboarding/data-sources", {
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
      formData.append("intent", "fetch-projects");
      formData.append("provider", "jira");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Data source not found");
    });

    it("returns cached projects when already fetched", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "JIRA",
        isEnabled: true,
        configs: [],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.project.count).mockResolvedValue(3);
      vi.mocked(db.project.findMany).mockResolvedValue([
        { id: "proj-1", name: "Project A", key: "PA", isEnabled: true },
        { id: "proj-2", name: "Project B", key: "PB", isEnabled: false },
        { id: "proj-3", name: "Project C", key: "PC", isEnabled: true },
      ] as never);

      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", "jira");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.projects).toHaveLength(3);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("initializes Jira Cloud projects when none exist", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "JIRA",
        isEnabled: true,
        configs: [
          { key: "JIRA_VARIANT", value: "cloud" },
          { key: "JIRA_DOMAIN", value: "my-company" },
          { key: "JIRA_EMAIL", value: "user@example.com" },
          { key: "JIRA_API_TOKEN", value: "token123" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.project.count).mockResolvedValue(0);
      vi.mocked(db.project.upsert).mockResolvedValue({} as never);
      vi.mocked(db.project.findMany).mockResolvedValue([{ id: "proj-1", name: "Project A", key: "PA", isEnabled: true }] as never);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: "ext-1", key: "PA", name: "Project A" }]),
      });

      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", "jira");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith("https://my-company.atlassian.net/rest/api/3/project", expect.anything());
      expect(db.project.upsert).toHaveBeenCalled();
    });

    it("initializes Jira Data Center projects when none exist", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "JIRA",
        isEnabled: true,
        configs: [
          { key: "JIRA_VARIANT", value: "datacenter" },
          { key: "JIRA_SERVER_URL", value: "https://jira.company.com" },
          { key: "JIRA_PAT", value: "pat123" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.project.count).mockResolvedValue(0);
      vi.mocked(db.project.upsert).mockResolvedValue({} as never);
      vi.mocked(db.project.findMany).mockResolvedValue([{ id: "proj-1", name: "Project A", key: "PA", isEnabled: true }] as never);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: "ext-1", key: "PA", name: "Project A" }]),
      });

      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", "jira");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith("https://jira.company.com/rest/api/2/project", expect.anything());
    });

    it("returns error when Jira project fetch fails", async () => {
      const mockDataSource = {
        id: "ds-1",
        provider: "JIRA",
        isEnabled: true,
        configs: [
          { key: "JIRA_VARIANT", value: "cloud" },
          { key: "JIRA_DOMAIN", value: "my-company" },
          { key: "JIRA_EMAIL", value: "user@example.com" },
          { key: "JIRA_API_TOKEN", value: "token123" },
        ],
      };
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
      vi.mocked(db.project.count).mockResolvedValue(0);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const formData = new FormData();
      formData.append("intent", "fetch-projects");
      formData.append("provider", "jira");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("Failed to fetch projects");
    });
  });

  describe("toggle-project intent", () => {
    it("returns error when projectId is missing", async () => {
      const formData = new FormData();
      formData.append("intent", "toggle-project");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Project ID is required");
    });

    it("enables project successfully", async () => {
      vi.mocked(db.project.update).mockResolvedValue({ id: "proj-1", isEnabled: true } as never);

      const formData = new FormData();
      formData.append("intent", "toggle-project");
      formData.append("projectId", "proj-1");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        data: { isEnabled: true },
      });
    });

    it("disables project successfully", async () => {
      vi.mocked(db.project.update).mockResolvedValue({ id: "proj-1", isEnabled: false } as never);

      const formData = new FormData();
      formData.append("intent", "toggle-project");
      formData.append("projectId", "proj-1");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      expect(db.project.update).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        data: { isEnabled: false },
      });
    });

    it("returns error when project not found", async () => {
      vi.mocked(db.project.update).mockRejectedValue(new Error("Record to update not found"));

      const formData = new FormData();
      formData.append("intent", "toggle-project");
      formData.append("projectId", "non-existent");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Project not found");
    });
  });

  describe("toggle-projects-batch intent", () => {
    it("enables multiple projects", async () => {
      vi.mocked(db.project.updateMany).mockResolvedValue({ count: 3 });

      const formData = new FormData();
      formData.append("intent", "toggle-projects-batch");
      formData.append("projectIds", "proj-1");
      formData.append("projectIds", "proj-2");
      formData.append("projectIds", "proj-3");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.count).toBe(3);
      expect(db.project.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["proj-1", "proj-2", "proj-3"] } },
        data: { isEnabled: true },
      });
    });

    it("disables multiple projects", async () => {
      vi.mocked(db.project.updateMany).mockResolvedValue({ count: 2 });

      const formData = new FormData();
      formData.append("intent", "toggle-projects-batch");
      formData.append("projectIds", "proj-1");
      formData.append("projectIds", "proj-2");
      formData.append("isEnabled", "false");

      const request = new Request("http://localhost/onboarding/data-sources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.count).toBe(2);
      expect(db.project.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["proj-1", "proj-2"] } },
        data: { isEnabled: false },
      });
    });

    it("handles empty projectIds array", async () => {
      vi.mocked(db.project.updateMany).mockResolvedValue({ count: 0 });

      const formData = new FormData();
      formData.append("intent", "toggle-projects-batch");
      formData.append("isEnabled", "true");

      const request = new Request("http://localhost/onboarding/data-sources", {
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

      const request = new Request("http://localhost/onboarding/data-sources", {
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

  describe("Jira connection", () => {
    it("returns error when variant is missing", async () => {
      const result = await testConnection("jira", {});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Jira version is required");
    });

    it("returns error when cloud config is incomplete", async () => {
      const result = await testConnection("jira", {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "my-company",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Domain, email, and API token are required for Jira Cloud");
    });

    it("returns error when datacenter config is incomplete", async () => {
      const result = await testConnection("jira", {
        JIRA_VARIANT: "datacenter",
        JIRA_SERVER_URL: "https://jira.company.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Server URL and Personal Access Token are required for Jira Data Center");
    });

    it("tests Jira Cloud connection successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accountId: "123" }),
      });

      const result = await testConnection("jira", {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "my-company",
        JIRA_EMAIL: "user@example.com",
        JIRA_API_TOKEN: "token123",
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://my-company.atlassian.net/rest/api/3/myself",
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
          }),
        })
      );
    });

    it("tests Jira Data Center connection successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ key: "user" }),
      });

      const result = await testConnection("jira", {
        JIRA_VARIANT: "datacenter",
        JIRA_SERVER_URL: "https://jira.company.com/",
        JIRA_PAT: "pat123",
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://jira.company.com/rest/api/2/myself",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer pat123",
            Accept: "application/json",
          }),
        })
      );
    });

    it("returns error when Jira API returns error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const result = await testConnection("jira", {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "my-company",
        JIRA_EMAIL: "user@example.com",
        JIRA_API_TOKEN: "invalid-token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Jira API returned 401");
    });

    it("handles Jira connection network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await testConnection("jira", {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "my-company",
        JIRA_EMAIL: "user@example.com",
        JIRA_API_TOKEN: "token123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });
});
