import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json" },
      }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: "user_1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
  }),
}));

vi.mock("~/routes/onboarding/data-sources/data-sources.server", () => ({
  extractConfigsFromForm: vi.fn((formData: FormData, provider: string) => {
    const configs: Record<string, string> = {};
    const providerConfig =
      {
        github: ["GITHUB_TOKEN", "GITHUB_ORG"],
        gitlab: ["GITLAB_TOKEN", "GITLAB_HOST"],
        jira: ["JIRA_VARIANT", "JIRA_DOMAIN", "JIRA_EMAIL", "JIRA_API_TOKEN"],
      }[provider] || [];

    for (const key of providerConfig) {
      const value = formData.get(key);
      if (typeof value === "string" && value) {
        configs[key] = value;
      }
    }
    return configs;
  }),
  testConnection: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("~/db.server", () => ({
  db: {
    dataSource: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    dataSourceConfig: {
      upsert: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    repository: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("~/lib/repositories/fetch-repositories", () => ({
  fetchGithubRepositories: vi.fn().mockResolvedValue([]),
  fetchGitlabRepositories: vi.fn().mockResolvedValue([]),
  saveRepositories: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/lib/repositories/repository-filters", () => ({
  getRepositoriesWithFilters: vi.fn().mockResolvedValue({
    repositories: [],
    totalCount: 0,
    nextCursor: undefined,
  }),
}));

vi.mock("~/lib/repositories/toggle-repositories", () => ({
  REPOSITORY_PAGE_SIZE: 50,
  DEFAULT_ACTIVE_THRESHOLD_DAYS: 90,
  toggleRepository: vi.fn().mockResolvedValue({ success: true }),
  toggleRepositoriesBatch: vi.fn().mockResolvedValue({ count: 0 }),
}));

import { db } from "~/db.server";
import { action, loader } from "./data-sources.server";

function createArgs(request: Request) {
  return { request, params: {}, context: {}, unstable_pattern: "" } as never;
}

describe("data-sources loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data sources with configs and run counts", async () => {
    vi.mocked(db.dataSource.findMany).mockResolvedValue([
      {
        id: "ds-1",
        name: "Test GitHub",
        provider: "GITHUB",
        isEnabled: true,
        configs: [
          { key: "GITHUB_TOKEN", value: "test_token", isSecret: true },
          { key: "GITHUB_ORG", value: "test-org", isSecret: false },
        ],
        _count: { runs: 0 },
      },
    ] as never);

    const request = new Request("http://localhost/settings/data-sources");
    const result = (await loader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.dataSources).toHaveLength(1);
    expect(data.dataSources[0].provider).toBe("GITHUB");
    expect(data.dataSources[0].configs).toHaveLength(2);
    expect(data.dataSources[0].configs[0].key).toBe("GITHUB_TOKEN");
    expect(data.dataSources[0]._count.runs).toBe(0);
  });

  it("returns empty array when no data sources exist", async () => {
    vi.mocked(db.dataSource.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/settings/data-sources");
    const result = (await loader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.dataSources).toHaveLength(0);
  });
});

describe("data-sources action - test intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tests connection successfully", async () => {
    const formData = new FormData();
    formData.append("intent", "test");
    formData.append("provider", "github");
    formData.append("GITHUB_TOKEN", "test_token");
    formData.append("GITHUB_ORG", "test-org");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.testSuccess).toBe(true);
    expect(data.provider).toBe("github");
  });
});

describe("data-sources action - connect intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new data source with configs", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({
      id: "org-1",
      name: "Test Organization",
      displayName: "Test Org",
      onboardingCompletedAt: null,
    } as never);
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
    vi.mocked(db.dataSource.create).mockResolvedValue({
      id: "ds-1",
      name: "github Integration",
      provider: "GITHUB",
      isEnabled: true,
    } as never);

    const formData = new FormData();
    formData.append("intent", "connect");
    formData.append("provider", "github");
    formData.append("GITHUB_TOKEN", "test_token");
    formData.append("GITHUB_ORG", "test-org");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(data.provider).toBe("github");
    expect(db.dataSource.create).toHaveBeenCalled();
  });

  it("updates existing data source", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({
      id: "org-1",
      name: "Test Organization",
      displayName: "Test Org",
      onboardingCompletedAt: null,
    } as never);
    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      name: "GitHub",
      provider: "GITHUB",
      isEnabled: false,
    } as never);
    vi.mocked(db.dataSource.update).mockResolvedValue({
      id: "ds-1",
      name: "GitHub",
      provider: "GITHUB",
      isEnabled: true,
    } as never);

    const formData = new FormData();
    formData.append("intent", "connect");
    formData.append("provider", "github");
    formData.append("GITHUB_TOKEN", "new_token");
    formData.append("GITHUB_ORG", "test-org");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    await action(createArgs(request));

    expect(db.dataSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ds-1" },
        data: { isEnabled: true },
      })
    );
  });
});

describe("data-sources action - delete intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes data source successfully", async () => {
    vi.mocked(db.dataSource.delete).mockResolvedValue({
      id: "ds-1",
      name: "GitHub",
      provider: "GITHUB",
    } as never);

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("dataSourceId", "ds-1");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(db.dataSource.delete).toHaveBeenCalledWith({
      where: { id: "ds-1" },
    });
  });

  it("returns error when data source not found", async () => {
    vi.mocked(db.dataSource.delete).mockRejectedValue(new Error("Record not found"));

    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("dataSourceId", "non-existent-id");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(500);
  });
});

describe("data-sources action - toggle-enabled intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles data source enabled state", async () => {
    vi.mocked(db.dataSource.update).mockResolvedValue({
      id: "ds-1",
      name: "GitHub",
      provider: "GITHUB",
      isEnabled: false,
    } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-enabled");
    formData.append("dataSourceId", "ds-1");
    formData.append("isEnabled", "false");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(db.dataSource.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { isEnabled: false },
    });
  });

  it("returns error when dataSourceId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "toggle-enabled");
    formData.append("isEnabled", "false");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
  });

  it("returns error when toggle fails", async () => {
    vi.mocked(db.dataSource.update).mockRejectedValue(new Error("Database error"));

    const formData = new FormData();
    formData.append("intent", "toggle-enabled");
    formData.append("dataSourceId", "ds-1");
    formData.append("isEnabled", "false");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(500);
  });
});

describe("data-sources action - fetch-repositories intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches repositories for a connected data source", async () => {
    const { getRepositoriesWithFilters } = await import("~/lib/repositories/repository-filters");

    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "GITHUB",
      isEnabled: true,
      configs: [{ key: "GITHUB_TOKEN", value: "token" }],
    } as never);
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [{ id: "repo-1", name: "test-repo" }],
      totalCount: 1,
      nextCursor: undefined,
    } as never);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "github");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.repositories).toBeDefined();
    expect(data.totalCount).toBe(1);
  });

  it("returns error for invalid provider", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "invalid");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
  });

  it("returns error when data source not found", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "github");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(404);
  });
});

describe("data-sources action - toggle-repository intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles repository enabled state", async () => {
    const { toggleRepository } = await import("~/lib/repositories/toggle-repositories");
    vi.mocked(toggleRepository).mockResolvedValue(undefined as never);

    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", "repo-1");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
  });

  it("returns error when repositoryId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
  });
});

describe("data-sources action - toggle-repositories-batch intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles multiple repositories", async () => {
    const { toggleRepositoriesBatch } = await import("~/lib/repositories/toggle-repositories");
    vi.mocked(toggleRepositoriesBatch).mockResolvedValue({ count: 3 });

    const formData = new FormData();
    formData.append("intent", "toggle-repositories-batch");
    formData.append("repositoryIds", "repo-1");
    formData.append("repositoryIds", "repo-2");
    formData.append("repositoryIds", "repo-3");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(data.count).toBe(3);
  });
});

describe("data-sources action - fetch-projects intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches projects for a connected data source", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "JIRA",
      isEnabled: true,
      configs: [
        { key: "JIRA_VARIANT", value: "cloud" },
        { key: "JIRA_DOMAIN", value: "test" },
        { key: "JIRA_EMAIL", value: "test@example.com" },
        { key: "JIRA_API_TOKEN", value: "token" },
      ],
    } as never);
    vi.mocked(db.project.count).mockResolvedValue(5);
    vi.mocked(db.project.findMany).mockResolvedValue([{ id: "proj-1", name: "Project 1", key: "PROJ1", isEnabled: true }] as never);

    const formData = new FormData();
    formData.append("intent", "fetch-projects");
    formData.append("provider", "jira");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.projects).toBeDefined();
    expect(data.projects).toHaveLength(1);
  });

  it("returns error for invalid provider", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-projects");
    formData.append("provider", "invalid");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
  });

  it("returns error when data source not found", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("intent", "fetch-projects");
    formData.append("provider", "jira");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(404);
  });
});

describe("data-sources action - toggle-project intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles project enabled state", async () => {
    vi.mocked(db.project.update).mockResolvedValue({
      id: "proj-1",
      isEnabled: true,
    } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "proj-1");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
  });

  it("returns error when projectId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    vi.mocked(db.project.update).mockRejectedValue(new Error("Record to update not found"));

    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "non-existent");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(404);
  });
});

describe("data-sources action - toggle-projects-batch intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles multiple projects", async () => {
    vi.mocked(db.project.updateMany).mockResolvedValue({ count: 2 });

    const formData = new FormData();
    formData.append("intent", "toggle-projects-batch");
    formData.append("projectIds", "proj-1");
    formData.append("projectIds", "proj-2");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
  });
});

describe("data-sources action - invalid intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for unknown intent", async () => {
    const formData = new FormData();
    formData.append("intent", "unknown-intent");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.errors.form).toBe("Invalid action");
  });
});

describe("data-sources action - connect intent validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when provider is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "connect");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.errors.provider).toBe("Provider is required");
  });

  it("returns error when provider is invalid", async () => {
    const formData = new FormData();
    formData.append("intent", "connect");
    formData.append("provider", "invalid-provider");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.errors.provider).toBe("Invalid provider");
  });
});

describe("data-sources action - delete intent validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when dataSourceId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "delete");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Data source ID is required");
  });
});

describe("data-sources action - test intent validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when provider is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "test");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.testError).toBe("Provider is required");
  });
});

describe("data-sources action - fetch-repositories intent validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when provider is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-repositories");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Provider is required");
  });

  it("returns error when provider is invalid", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "invalid-provider");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Invalid provider");
  });
});

describe("data-sources action - fetch-projects intent validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when provider is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-projects");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Provider is required");
  });

  it("returns error when provider is invalid", async () => {
    const formData = new FormData();
    formData.append("intent", "fetch-projects");
    formData.append("provider", "invalid-provider");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error).toBe("Invalid provider");
  });
});

describe("data-sources action - initialize repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes GitHub repositories when none exist", async () => {
    const { fetchGithubRepositories, saveRepositories } = await import("~/lib/repositories/fetch-repositories");
    const { getRepositoriesWithFilters } = await import("~/lib/repositories/repository-filters");

    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "GITHUB",
      isEnabled: true,
      configs: [
        { key: "GITHUB_TOKEN", value: "test-token" },
        { key: "GITHUB_ORG", value: "test-org" },
      ],
    } as never);

    vi.mocked(db.repository.count).mockResolvedValue(0);
    vi.mocked(fetchGithubRepositories).mockResolvedValue([
      { id: "1", name: "repo1", fullName: "org/repo1", isPrivate: false, language: "TypeScript", stars: 10, updatedAt: new Date() },
    ] as never);
    vi.mocked(saveRepositories).mockResolvedValue(undefined);
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [{ id: "repo-1", name: "test-repo" }],
      totalCount: 1,
      nextCursor: undefined,
    } as never);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "github");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(fetchGithubRepositories).toHaveBeenCalledWith({
      token: "test-token",
      organization: "test-org",
    });
    expect(saveRepositories).toHaveBeenCalled();
    expect(data.repositories).toBeDefined();
  });

  it("initializes GitLab repositories when none exist", async () => {
    const { fetchGitlabRepositories, saveRepositories } = await import("~/lib/repositories/fetch-repositories");
    const { getRepositoriesWithFilters } = await import("~/lib/repositories/repository-filters");

    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "GITLAB",
      isEnabled: true,
      configs: [
        { key: "GITLAB_TOKEN", value: "test-token" },
        { key: "GITLAB_HOST", value: "https://gitlab.example.com" },
      ],
    } as never);

    vi.mocked(db.repository.count).mockResolvedValue(0);
    vi.mocked(fetchGitlabRepositories).mockResolvedValue([
      { id: "1", name: "repo1", fullName: "org/repo1", isPrivate: false, language: "TypeScript", stars: 10, updatedAt: new Date() },
    ] as never);
    vi.mocked(saveRepositories).mockResolvedValue(undefined);
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(getRepositoriesWithFilters).mockResolvedValue({
      repositories: [{ id: "repo-1", name: "test-repo" }],
      totalCount: 1,
      nextCursor: undefined,
    } as never);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "gitlab");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(fetchGitlabRepositories).toHaveBeenCalledWith({
      token: "test-token",
      host: "https://gitlab.example.com",
    });
    expect(data.repositories).toBeDefined();
  });

  it("returns error when GitHub token is missing", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "GITHUB",
      isEnabled: true,
      configs: [{ key: "GITHUB_ORG", value: "test-org" }],
    } as never);

    vi.mocked(db.repository.count).mockResolvedValue(0);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "github");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(500);
    const data = await result.json();
    expect(data.error).toContain("Failed to fetch repositories");
  });

  it("returns error when GitLab token is missing", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue({
      id: "ds-1",
      provider: "GITLAB",
      isEnabled: true,
      configs: [{ key: "GITLAB_HOST", value: "https://gitlab.example.com" }],
    } as never);

    vi.mocked(db.repository.count).mockResolvedValue(0);

    const formData = new FormData();
    formData.append("intent", "fetch-repositories");
    formData.append("provider", "gitlab");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(500);
    const data = await result.json();
    expect(data.error).toContain("Failed to fetch repositories");
  });
});

describe("data-sources action - create organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates organization when none exists", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue(null);
    vi.mocked(db.organization.create).mockResolvedValue({
      id: "org-new",
      name: "default",
      displayName: "Default Organization",
      onboardingCompletedAt: null,
    } as never);
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
    vi.mocked(db.dataSource.create).mockResolvedValue({
      id: "ds-1",
      name: "github Integration",
      provider: "GITHUB",
      isEnabled: true,
    } as never);

    const formData = new FormData();
    formData.append("intent", "connect");
    formData.append("provider", "github");
    formData.append("GITHUB_TOKEN", "test_token");
    formData.append("GITHUB_ORG", "test-org");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(db.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: "default",
          displayName: "Default Organization",
        },
      })
    );
    expect(data.success).toBe(true);
  });
});

describe("data-sources action - test connection failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when connection test fails", async () => {
    const { testConnection } = await import("~/routes/onboarding/data-sources/data-sources.server");
    vi.mocked(testConnection).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const formData = new FormData();
    formData.append("intent", "test");
    formData.append("provider", "github");
    formData.append("GITHUB_TOKEN", "invalid_token");
    formData.append("GITHUB_ORG", "test-org");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.testError).toBe("Invalid credentials");
    expect(data.provider).toBe("github");

    vi.mocked(testConnection).mockResolvedValue({ success: true });
  });
});

describe("data-sources action - toggle repository error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when toggle repository fails", async () => {
    const { toggleRepository } = await import("~/lib/repositories/toggle-repositories");
    vi.mocked(toggleRepository).mockRejectedValue(new Error("Repository not found"));

    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", "non-existent");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(404);
    const data = await result.json();
    expect(data.error).toBe("Repository not found");
  });
});

describe("data-sources action - toggle project error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when toggle project fails with generic error", async () => {
    vi.mocked(db.project.update).mockRejectedValue(new Error("Database connection failed"));

    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "proj-1");
    formData.append("isEnabled", "true");

    const request = new Request("http://localhost/settings/data-sources", {
      method: "POST",
      body: formData,
    });

    const result = (await action(createArgs(request))) as unknown as Response;

    expect(result.status).toBe(500);
    const data = await result.json();
    expect(data.error).toBe("Database connection failed");
  });
});
