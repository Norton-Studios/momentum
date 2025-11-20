import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contributorScript } from "./contributor.js";

const mockPaginateIterator = vi.fn();
const mockReposListContributors = vi.fn();
const mockUsersGetByUsername = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class {
    repos = {
      listContributors: mockReposListContributors,
    };
    users = {
      getByUsername: mockUsersGetByUsername,
    };
    paginate = {
      iterator: mockPaginateIterator,
    };
  },
}));

describe("contributorScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(contributorScript.dataSourceName).toBe("GITHUB");
    expect(contributorScript.resource).toBe("contributor");
    expect(contributorScript.dependsOn).toEqual(["repository"]);
    expect(contributorScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof contributorScript.run).toBe("function");
  });

  it("should fetch and upsert contributors successfully", async () => {
    // Arrange
    const mockContributors = [
      {
        login: "user1",
        id: 123,
        avatar_url: "https://avatar1.com",
      },
      {
        login: "user2",
        id: 456,
        avatar_url: "https://avatar2.com",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockContributors };
      })()
    );
    mockUsersGetByUsername
      .mockResolvedValueOnce({ data: { name: "User One", email: "user1@example.com" } } as never)
      .mockResolvedValueOnce({ data: { name: "User Two", email: "user2@example.com" } } as never);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockPaginateIterator).toHaveBeenCalledWith(mockReposListContributors, {
      owner: "org",
      repo: "repo1",
      per_page: 100,
    });
    expect(mockUsersGetByUsername).toHaveBeenCalledTimes(2);
    expect(mockUsersGetByUsername).toHaveBeenCalledWith({ username: "user1" });
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.contributor.upsert).toHaveBeenCalledWith({
      where: {
        provider_email: {
          provider: "GITHUB",
          email: "user1@example.com",
        },
      },
      create: {
        name: "User One",
        email: "user1@example.com",
        username: "user1",
        provider: "GITHUB",
        providerUserId: "123",
        avatarUrl: "https://avatar1.com",
      },
      update: {
        name: "User One",
        username: "user1",
        providerUserId: "123",
        avatarUrl: "https://avatar1.com",
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should filter out invalid contributors", async () => {
    // Arrange
    const mockContributors = [
      {
        login: "user1",
        id: 123,
        avatar_url: "https://avatar1.com",
      },
      {
        login: undefined,
        id: 456,
        avatar_url: "https://avatar2.com",
      },
      {
        login: "user3",
        id: undefined,
        avatar_url: "https://avatar3.com",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockContributors };
      })()
    );
    mockUsersGetByUsername.mockResolvedValue({ data: { name: "User One", email: "user1@example.com" } } as never);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should use fallback email if user API call fails", async () => {
    // Arrange
    const mockContributors = [
      {
        login: "user1",
        id: 123,
        avatar_url: "https://avatar1.com",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockContributors };
      })()
    );
    mockUsersGetByUsername.mockRejectedValue(new Error("User not found"));

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockDb.contributor.upsert).toHaveBeenCalledWith({
      where: {
        provider_email: {
          provider: "GITHUB",
          email: "user1@github.com",
        },
      },
      create: {
        name: "user1",
        email: "user1@github.com",
        username: "user1",
        provider: "GITHUB",
        providerUserId: "123",
        avatarUrl: "https://avatar1.com",
      },
      update: {
        name: "user1",
        username: "user1",
        providerUserId: "123",
        avatarUrl: "https://avatar1.com",
      },
    });
  });

  it("should handle errors and log them", async () => {
    // Arrange
    mockPaginateIterator.mockImplementation(() => {
      throw new Error("API Error");
    });

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      importLog: {
        create: vi.fn().mockResolvedValue({}),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import contributors for org/repo1: API Error",
        details: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle empty repository list", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      importLog: {
        create: vi.fn(),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockDb.importLog.create).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should handle pagination correctly", async () => {
    // Arrange
    const mockContributorsBatch1 = [
      {
        login: "user1",
        id: 123,
        avatar_url: "https://avatar1.com",
      },
    ];
    const mockContributorsBatch2 = [
      {
        login: "user2",
        id: 456,
        avatar_url: "https://avatar2.com",
      },
    ];

    mockPaginateIterator.mockReturnValue(
      (async function* () {
        yield { data: mockContributorsBatch1 };
        yield { data: mockContributorsBatch2 };
      })()
    );
    mockUsersGetByUsername
      .mockResolvedValueOnce({ data: { name: "User One", email: "user1@example.com" } } as never)
      .mockResolvedValueOnce({ data: { name: "User Two", email: "user2@example.com" } } as never);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "org/repo1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      importLog: {
        create: vi.fn(),
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
      },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(context);

    // Assert
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });
});
