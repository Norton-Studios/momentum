import { describe, it, expect, vi, beforeEach } from "vitest";
import { run } from "./repository";

const mockDb = {
  repository: {
    upsert: vi.fn(),
  },
};

const mockOctokit = {
  repos: {
    listForAuthenticatedUser: vi.fn(),
    listForOrg: vi.fn(),
  },
};

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

describe("GitHub Repository Data Source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch user repositories when no organization is specified", async () => {
    const env = { GITHUB_TOKEN: "ghp_test123" };
    const tenantId = "test-tenant-id";
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    const testRepo = {
      id: 1,
      name: "test-repo",
      description: "A test repository",
      owner: { login: "test-owner" },
      html_url: "https://github.com/test-owner/test-repo",
      language: "TypeScript",
      private: false,
      stargazers_count: 10,
      forks_count: 5,
      open_issues_count: 2,
      created_at: "2024-01-15T00:00:00.000Z",
      updated_at: "2024-01-20T00:00:00.000Z",
    };

    mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [testRepo],
    });

    await run(env, mockDb as any, tenantId, startDate, endDate);

    expect(mockOctokit.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
      per_page: 100,
      type: "all",
    });

    expect(mockDb.repository.upsert).toHaveBeenCalledOnce();
    const upsertArg = mockDb.repository.upsert.mock.calls[0][0];

    expect(upsertArg.where.tenantId_externalId).toEqual({
      tenantId: "test-tenant-id",
      externalId: "1",
    });
    expect(upsertArg.create.name).toBe("test-repo");
    expect(upsertArg.create.owner).toBe("test-owner");
    expect(upsertArg.create.tenantId).toBe("test-tenant-id");
  });

  it("should fetch organization repositories when GITHUB_ORG is specified", async () => {
    const env = { GITHUB_TOKEN: "ghp_test123", GITHUB_ORG: "test-org" };
    const tenantId = "test-tenant-id";
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    const testRepo = {
      id: 2,
      name: "org-repo",
      description: "An organization repository",
      owner: { login: "test-org" },
      html_url: "https://github.com/test-org/org-repo",
      language: "JavaScript",
      private: true,
      stargazers_count: 20,
      forks_count: 10,
      open_issues_count: 5,
      created_at: "2024-01-10T00:00:00.000Z",
      updated_at: "2024-01-25T00:00:00.000Z",
    };

    mockOctokit.repos.listForOrg.mockResolvedValue({
      data: [testRepo],
    });

    await run(env, mockDb as any, tenantId, startDate, endDate);

    expect(mockOctokit.repos.listForOrg).toHaveBeenCalledWith({
      org: "test-org",
      per_page: 100,
      type: "all",
    });

    expect(mockDb.repository.upsert).toHaveBeenCalledOnce();
    const upsertArg = mockDb.repository.upsert.mock.calls[0][0];

    expect(upsertArg.where.tenantId_externalId).toEqual({
      tenantId: "test-tenant-id",
      externalId: "2",
    });
    expect(upsertArg.create.name).toBe("org-repo");
    expect(upsertArg.create.owner).toBe("test-org");
    expect(upsertArg.create.isPrivate).toBe(true);
  });

  it("should filter repositories by date range", async () => {
    const env = { GITHUB_TOKEN: "ghp_test123" };
    const tenantId = "test-tenant-id";
    const startDate = new Date("2024-01-15");
    const endDate = new Date("2024-01-25");

    const repoInRange = {
      id: 1,
      name: "in-range-repo",
      owner: { login: "test-owner" },
      updated_at: "2024-01-20T00:00:00.000Z",
    };

    const repoOutOfRange = {
      id: 2,
      name: "out-of-range-repo",
      owner: { login: "test-owner" },
      updated_at: "2024-01-01T00:00:00.000Z", // Before start date
    };

    mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [repoInRange, repoOutOfRange],
    });

    await run(env, mockDb as any, tenantId, startDate, endDate);

    // Should only process the repo within the date range
    expect(mockDb.repository.upsert).toHaveBeenCalledOnce();
    const upsertArg = mockDb.repository.upsert.mock.calls[0][0];
    expect(upsertArg.create.name).toBe("in-range-repo");
  });

  it("should throw error when GITHUB_TOKEN is missing", async () => {
    const env = {}; // No GITHUB_TOKEN
    const tenantId = "test-tenant-id";
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    await expect(run(env, mockDb as any, tenantId, startDate, endDate)).rejects.toThrow("GITHUB_TOKEN is required in tenant configuration");
  });

  it("should skip repositories without owners", async () => {
    const env = { GITHUB_TOKEN: "ghp_test123" };
    const tenantId = "test-tenant-id";
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    const validRepo = {
      id: 1,
      name: "valid-repo",
      owner: { login: "test-owner" },
      updated_at: "2024-01-20T00:00:00.000Z",
    };

    const invalidRepo = {
      id: 2,
      name: "invalid-repo",
      owner: null, // No owner
      updated_at: "2024-01-20T00:00:00.000Z",
    };

    mockOctokit.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [validRepo, invalidRepo],
    });

    await run(env, mockDb as any, tenantId, startDate, endDate);

    // Should only process the valid repo
    expect(mockDb.repository.upsert).toHaveBeenCalledOnce();
    const upsertArg = mockDb.repository.upsert.mock.calls[0][0];
    expect(upsertArg.create.name).toBe("valid-repo");
  });
});
