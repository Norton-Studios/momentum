import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  discoverRepositories,
  getRepositoriesForTenant,
  addRepositoryToTenant,
  removeRepositoryFromTenant,
  type DiscoveredRepository,
} from "./repository-discovery";
import type { PrismaClient } from "@mmtm/database";

// Mock Octokit
const mockListForAuthenticatedUser = vi.fn();
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    repos: {
      listForAuthenticatedUser: mockListForAuthenticatedUser,
    },
  })),
}));

// Mock the PrismaClient
const mockDb = {
  tenantDataSourceConfig: {
    findMany: vi.fn(),
  },
  repository: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaClient;

const mockDiscoveredRepo: DiscoveredRepository = {
  externalId: "12345",
  name: "test-repo",
  description: "A test repository",
  owner: "test-owner",
  url: "https://github.com/test-owner/test-repo",
  language: "TypeScript",
  isPrivate: false,
  stars: 100,
  forks: 25,
  issues: 5,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
};

describe("repository-discovery hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("discoverRepositories", () => {
    it("discovers repositories from GitHub data source", async () => {
      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "github",
          key: "token",
          value: "github-token-123",
        },
      ]);

      mockListForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 12345,
            name: "test-repo",
            description: "A test repository",
            owner: { login: "test-owner" },
            html_url: "https://github.com/test-owner/test-repo",
            language: "TypeScript",
            private: false,
            stargazers_count: 100,
            forks_count: 25,
            open_issues_count: 5,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-15T00:00:00Z",
          },
        ],
      });

      const results = await discoverRepositories("tenant-1", mockDb);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        repositories: [mockDiscoveredRepo],
        dataSource: "github",
        totalCount: 1,
      });
    });

    it("handles no data source configurations", async () => {
      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue([]);

      const results = await discoverRepositories("tenant-1", mockDb);

      expect(results).toHaveLength(0);
    });

    it("handles GitHub API errors gracefully", async () => {
      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "github",
          key: "token",
          value: "invalid-token",
        },
      ]);

      mockListForAuthenticatedUser.mockRejectedValue(new Error("Bad credentials"));

      const results = await discoverRepositories("tenant-1", mockDb);

      expect(results).toHaveLength(0);
    });

    it("filters out repositories without owners", async () => {
      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue([
        {
          tenantId: "tenant-1",
          dataSource: "github",
          key: "token",
          value: "github-token-123",
        },
      ]);

      mockListForAuthenticatedUser.mockResolvedValue({
        data: [
          {
            id: 12345,
            name: "valid-repo",
            owner: { login: "test-owner" },
            html_url: "https://github.com/test-owner/valid-repo",
            private: false,
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-15T00:00:00Z",
          },
          {
            id: 67890,
            name: "invalid-repo",
            owner: null, // This should be filtered out
            html_url: "https://github.com/invalid-repo",
          },
        ],
      });

      const results = await discoverRepositories("tenant-1", mockDb);

      expect(results).toHaveLength(1);
      expect(results[0].repositories).toHaveLength(1);
      expect(results[0].repositories[0].name).toBe("valid-repo");
    });
  });

  describe("getRepositoriesForTenant", () => {
    const mockRepositories = [
      {
        id: 1,
        name: "repo-1",
        description: "Repository 1",
        owner: "owner-1",
        tenantId: "tenant-1",
      },
      {
        id: 2,
        name: "repo-2",
        description: "Repository 2",
        owner: "owner-2",
        tenantId: "tenant-1",
      },
    ];

    it("retrieves repositories for a tenant", async () => {
      (mockDb.repository.findMany as any).mockResolvedValue(mockRepositories);

      const result = await getRepositoriesForTenant("tenant-1", mockDb);

      expect(mockDb.repository.findMany).toHaveBeenCalledWith({
        where: { tenantId: "tenant-1" },
        orderBy: [{ updatedAt: "desc" }],
      });
      expect(result).toEqual(mockRepositories);
    });
  });

  describe("addRepositoryToTenant", () => {
    const mockCreatedRepo = {
      id: 1,
      ...mockDiscoveredRepo,
      tenantId: "tenant-1",
    };

    it("adds a new repository to tenant tracking", async () => {
      (mockDb.repository.upsert as any).mockResolvedValue(mockCreatedRepo);

      const result = await addRepositoryToTenant("tenant-1", mockDiscoveredRepo, mockDb);

      expect(mockDb.repository.upsert).toHaveBeenCalledWith({
        where: { externalId: "12345" },
        update: {
          ...mockDiscoveredRepo,
          tenantId: "tenant-1",
        },
        create: {
          ...mockDiscoveredRepo,
          tenantId: "tenant-1",
        },
      });
      expect(result).toEqual(mockCreatedRepo);
    });
  });

  describe("removeRepositoryFromTenant", () => {
    it("removes a repository from tenant tracking", async () => {
      (mockDb.repository.delete as any).mockResolvedValue({ id: 1 });

      await removeRepositoryFromTenant("tenant-1", 1, mockDb);

      expect(mockDb.repository.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "tenant-1",
        },
      });
    });
  });
});
