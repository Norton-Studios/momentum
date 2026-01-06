import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { contributorScript } from "./contributor.js";

const mockProjectsShow = vi.fn();
const mockProjectsAllUsers = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
      allUsers: mockProjectsAllUsers,
    };
  },
}));

describe("contributorScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(contributorScript.dataSourceName).toBe("GITLAB");
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
        id: 1,
        username: "user1",
        name: "User One",
        email: "user1@example.com",
        avatarUrl: "https://gitlab.com/avatar1.png",
      },
      {
        id: 2,
        username: "user2",
        name: "User Two",
        email: null,
        avatarUrl: "https://gitlab.com/avatar2.png",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockProjectsAllUsers.mockResolvedValue(mockContributors);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITLAB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
    expect(mockProjectsShow).toHaveBeenCalledWith("group/project1");
    expect(mockProjectsAllUsers).toHaveBeenCalledWith(123);
    expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.contributor.upsert).toHaveBeenCalledWith({
      where: {
        provider_email: {
          provider: "GITLAB",
          email: "user1@example.com",
        },
      },
      create: {
        name: "User One",
        email: "user1@example.com",
        username: "user1",
        provider: "GITLAB",
        providerUserId: "1",
        avatarUrl: "https://gitlab.com/avatar1.png",
      },
      update: {
        name: "User One",
        username: "user1",
        providerUserId: "1",
        avatarUrl: "https://gitlab.com/avatar1.png",
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle empty repository list", async () => {
    // Arrange
    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(mockDb, context as never);

    // Assert
    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should log errors and continue processing other repositories", async () => {
    // Arrange
    mockProjectsShow.mockRejectedValue(new Error("API Error"));

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      importLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as DbClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: {
        GITLAB_TOKEN: "token123",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    // Act
    await contributorScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import contributors for group/project1"),
        details: null,
      },
    });
  });
});
