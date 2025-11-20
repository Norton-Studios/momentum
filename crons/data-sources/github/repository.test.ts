import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { repositoryScript } from "./repository.js";

const mockPaginateIterator = vi.fn();
const mockReposListForOrg = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    repos = {
      listForOrg: mockReposListForOrg,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("repositoryScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(repositoryScript.dataSourceName).toBe("GITHUB");
    expect(repositoryScript.resource).toBe("repository");
    expect(repositoryScript.dependsOn).toEqual([]);
    expect(repositoryScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof repositoryScript.run).toBe("function");
  });

  it("should fetch and upsert repositories successfully", async () => {
    // Arrange
    const mockRepos = [
      {
        name: "repo1",
        full_name: "org/repo1",
        description: "Test repo 1",
        html_url: "https://github.com/org/repo1",
        language: "TypeScript",
        stargazers_count: 100,
        forks_count: 10,
        private: false,
      },
      {
        name: "repo2",
        full_name: "org/repo2",
        description: "Test repo 2",
        html_url: "https://github.com/org/repo2",
        language: "JavaScript",
        stargazers_count: 50,
        forks_count: 5,
        private: true,
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockRepos };
      })()
    );

    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      dataSourceId: "ds-123",
      dataSourceName: "GITHUB",
      env: {
        GITHUB_TOKEN: "token123",
        GITHUB_ORG: "org",
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(context);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockReposListForOrg, { org: "org", per_page: 100 });
    expect(mockDb.repository.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.repository.upsert).toHaveBeenCalledWith({
      where: { fullName: "org/repo1" },
      create: {
        name: "repo1",
        fullName: "org/repo1",
        description: "Test repo 1",
        provider: "GITHUB",
        url: "https://github.com/org/repo1",
        language: "TypeScript",
        stars: 100,
        forks: 10,
        isPrivate: false,
        lastSyncAt: expect.any(Date),
      },
      update: {
        description: "Test repo 1",
        language: "TypeScript",
        stars: 100,
        forks: 10,
        lastSyncAt: expect.any(Date),
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle pagination correctly", async () => {
    // Arrange
    const mockReposBatch1 = [
      { name: "repo1", full_name: "org/repo1", description: null, html_url: "https://github.com/org/repo1", language: null, stargazers_count: 0, forks_count: 0, private: false },
    ];
    const mockReposBatch2 = [
      { name: "repo2", full_name: "org/repo2", description: null, html_url: "https://github.com/org/repo2", language: null, stargazers_count: 0, forks_count: 0, private: false },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockReposBatch1 };
        yield { data: mockReposBatch2 };
      })()
    );

    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      dataSourceId: "ds-123",
      dataSourceName: "GITHUB",
      env: {
        GITHUB_TOKEN: "token123",
        GITHUB_ORG: "org",
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(context);

    // Assert
    expect(mockDb.repository.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle empty repository list", async () => {
    // Arrange
    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: [] };
      })()
    );

    const mockDb = {
      repository: {
        upsert: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      dataSourceId: "ds-123",
      dataSourceName: "GITHUB",
      env: {
        GITHUB_TOKEN: "token123",
        GITHUB_ORG: "org",
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await repositoryScript.run(context);

    // Assert
    expect(mockDb.repository.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });
});
