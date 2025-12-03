import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueScript } from "./issue.js";

const mockProjectsShow = vi.fn();
const mockIssuesAll = vi.fn();

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class {
    Projects = {
      show: mockProjectsShow,
    };
    Issues = {
      all: mockIssuesAll,
    };
  },
}));

describe("issueScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(issueScript.dataSourceName).toBe("GITLAB");
    expect(issueScript.resource).toBe("issue");
    expect(issueScript.dependsOn).toEqual(["repository", "contributor", "project"]);
    expect(issueScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof issueScript.run).toBe("function");
  });

  it("should fetch and upsert issues successfully", async () => {
    const mockIssues = [
      {
        iid: 1,
        title: "Fix bug",
        description: "Bug description",
        state: "opened",
        labels: ["bug"],
        closedAt: null,
        webUrl: "https://gitlab.com/group/project/-/issues/1",
        author: { username: "dev1", name: "Developer One", email: "dev1@example.com" },
        assignee: { username: "dev2", name: "Developer Two", email: "dev2@example.com" },
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockIssuesAll.mockResolvedValue(mockIssues);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockDb.repository.findMany).toHaveBeenCalledWith({
      where: {
        provider: "GITLAB",
        dataSourceId: "ds-123",
        isEnabled: true,
      },
    });
    expect(mockProjectsShow).toHaveBeenCalledWith("group/project1");
    expect(mockIssuesAll).toHaveBeenCalledWith({
      projectId: 123,
      updatedAfter: "2024-01-01T00:00:00.000Z",
      updatedBefore: "2024-01-31T00:00:00.000Z",
      perPage: 100,
    });
    expect(mockDb.issue.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should handle empty repository list", async () => {
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
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockProjectsShow).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should infer issue type from labels", async () => {
    const mockIssues = [
      {
        iid: 1,
        title: "Bug issue",
        description: null,
        state: "opened",
        labels: ["bug", "urgent"],
        closedAt: null,
        webUrl: "https://gitlab.com/group/project/-/issues/1",
        author: { username: "dev1", name: "Developer", email: "dev@example.com" },
        assignee: null,
      },
      {
        iid: 2,
        title: "Feature issue",
        description: null,
        state: "opened",
        labels: ["feature"],
        closedAt: null,
        webUrl: "https://gitlab.com/group/project/-/issues/2",
        author: { username: "dev1", name: "Developer", email: "dev@example.com" },
        assignee: null,
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockIssuesAll.mockResolvedValue(mockIssues);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({ type: "BUG", priority: "CRITICAL" }),
      })
    );
    expect(mockDb.issue.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({ type: "FEATURE" }),
      })
    );
  });

  it("should handle closed issues", async () => {
    const mockIssues = [
      {
        iid: 1,
        title: "Closed issue",
        description: null,
        state: "closed",
        labels: [],
        closedAt: "2024-01-15T10:00:00Z",
        webUrl: "https://gitlab.com/group/project/-/issues/1",
        author: { username: "dev1", name: "Developer", email: "dev@example.com" },
        assignee: null,
      },
    ];

    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockIssuesAll.mockResolvedValue(mockIssues);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: "project-1" }),
      },
      contributor: {
        upsert: vi.fn().mockResolvedValue({ id: "contributor-1" }),
      },
      issue: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockDb.issue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "DONE",
          resolvedAt: expect.any(Date),
        }),
      })
    );
  });

  it("should log errors and continue processing on API failure", async () => {
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
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "GITLAB",
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: expect.stringContaining("Failed to import issues for group/project1"),
        details: null,
      },
    });
  });

  it("should skip issues when project not found", async () => {
    mockProjectsShow.mockResolvedValue({ id: 123 });
    mockIssuesAll.mockResolvedValue([{ iid: 1, title: "Test" }]);

    const mockDb = {
      repository: {
        findMany: vi.fn().mockResolvedValue([{ id: "repo-1", fullName: "group/project1" }]),
      },
      project: {
        findUnique: vi.fn().mockResolvedValue(null),
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
      env: { GITLAB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await issueScript.run(mockDb, context as never);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Project not found for repository group/project1",
        details: null,
      },
    });
  });
});
