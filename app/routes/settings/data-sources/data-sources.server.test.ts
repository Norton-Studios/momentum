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

vi.mock("~/routes/onboarding/datasources/datasources.server", () => ({
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
  },
}));

import { db } from "~/db.server";
import { action, loader } from "./data-sources.server";

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
    const result = (await loader({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
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
    const result = (await loader({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
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

    const result = (await action({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
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

    const result = (await action({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
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

    await action({
      request,
      params: {},
      context: {},
    });

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

    const result = (await action({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
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

    const result = (await action({
      request,
      params: {},
      context: {},
    })) as unknown as Response;

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

    const result = (await action({
      request,
      params: {},
      context: {},
    })) as unknown as Response;
    const data = await result.json();

    expect(data.success).toBe(true);
    expect(db.dataSource.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { isEnabled: false },
    });
  });
});
