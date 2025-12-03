import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergeRequestScript } from "./merge-request.js";

const mockProjectsShow = vi.fn();
const mockMergeRequestsAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
    };
    MergeRequests = {
      all: mockMergeRequestsAll,
    };
  },
}));

describe("mergeRequestScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(mergeRequestScript.dataSourceName).toBe("GITLAB");
    expect(mergeRequestScript.resource).toBe("merge-request");
    expect(mergeRequestScript.dependsOn).toEqual(["repository", "contributor"]);
    expect(mergeRequestScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof mergeRequestScript.run).toBe("function");
  });

  it("should fetch and upsert merge requests successfully", async () => {
    // Arrange
    const mockMergeRequests = [
      {
        iid: 1,
        title: "Add feature",
        description: "This adds a new feature",
        state: "merged",
        workInProgress: false,
        draft: false,
        mergedAt: "2024-01-20T10:00:00Z",
        closedAt: null,
        updatedAt: "2024-01-20T10:00:00Z",
        author: { username: "developer", name: "Developer", email: "dev@example.com" },
        assignee: null,
        sourceBranch: "feature/add-feature",
        targetBranch: "main",
        webUrl: "https://gitlab.com/group/project/-/merge_requests/1",
      },
      {
        iid: 2,
        title: "Draft: WIP feature",
        description: null,
        state: "opened",
        workInProgress: true,
        draft: true,
        mergedAt: null,
        closedAt: null,
        updatedAt: "2024-01-21T14:00:00Z",
        author: { username: "dev2", name: "Developer 2", email: null },
        assignee: { username: "reviewer", name: "Reviewer", email: "reviewer@example.com" },
        sourceBranch: "feature/wip",
        targetBranch: "main",
        webUrl: "https://gitlab.com/group/project/-/merge_requests/2",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockMergeRequestsAll.mockResolvedValue(mockMergeRequests);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      mergeRequest: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

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
    await mergeRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITLAB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
    expect(mockProjectsShow).toHaveBeenCalledWith("group/project");
    expect(mockMergeRequestsAll).toHaveBeenCalledWith({
      projectId: 123,
      updatedAfter: "2024-01-01T00:00:00.000Z",
      updatedBefore: "2024-01-31T00:00:00.000Z",
      perPage: 100,
    });
    expect(mockDb.mergeRequest.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.mergeRequest.upsert).toHaveBeenCalledWith({
      where: {
        repositoryId_number: {
          repositoryId: "repo-1",
          number: 1,
        },
      },
      create: {
        number: 1,
        title: "Add feature",
        description: "This adds a new feature",
        state: "MERGED",
        authorId: "contributor-1",
        assigneeId: undefined,
        repositoryId: "repo-1",
        sourceBranch: "feature/add-feature",
        targetBranch: "main",
        url: "https://gitlab.com/group/project/-/merge_requests/1",
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
        commitsCount: 0,
        mergedAt: expect.any(Date),
        closedAt: null,
      },
      update: {
        title: "Add feature",
        description: "This adds a new feature",
        state: "MERGED",
        assigneeId: undefined,
        linesAdded: 0,
        linesRemoved: 0,
        filesChanged: 0,
        commitsCount: 0,
        mergedAt: expect.any(Date),
        closedAt: null,
      },
    });
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should correctly identify draft merge requests", async () => {
    // Arrange
    const mockMergeRequests = [
      {
        iid: 1,
        title: "Draft: Work in progress",
        description: null,
        state: "opened",
        workInProgress: false,
        draft: false,
        mergedAt: null,
        closedAt: null,
        updatedAt: "2024-01-15T10:00:00Z",
        author: { username: "dev", name: "Developer" },
        assignee: null,
        sourceBranch: "feature/draft",
        targetBranch: "main",
        webUrl: "https://gitlab.com/group/project/-/merge_requests/1",
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockMergeRequestsAll.mockResolvedValue(mockMergeRequests);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project" }]),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      mergeRequest: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

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
    await mergeRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.mergeRequest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          state: "DRAFT",
        }),
      })
    );
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
    } as unknown as PrismaClient;

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
    await mergeRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should log errors and continue processing", async () => {
    // Arrange
    mockProjectsShow.mockRejectedValue(new Error("API Error"));

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project" }]),
      },
      importLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

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
    await mergeRequestScript.run(mockDb, context as never);

    // Assert
    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import merge requests for group/project"),
        details: null,
      },
    });
  });
});
