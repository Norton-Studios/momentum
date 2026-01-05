import { beforeEach, describe, expect, it, vi } from "vitest";
import { statusTransitionScript } from "./status-transition.js";

vi.mock("./client.js", () => ({
  createJiraClient: vi.fn(),
}));

import { createJiraClient } from "./client.js";

const mockCreateJiraClient = vi.mocked(createJiraClient);

describe("statusTransitionScript", () => {
  const mockDb = {
    issue: {
      findMany: vi.fn(),
    },
    issueStatusTransition: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    contributor: {
      upsert: vi.fn(),
    },
    dataSourceRun: {
      update: vi.fn(),
    },
    importLog: {
      create: vi.fn(),
    },
  };

  const mockContext = {
    id: "ds-123",
    runId: "run-456",
    tenantId: "tenant-789",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-03-31"),
    env: {
      JIRA_VARIANT: "cloud",
      JIRA_DOMAIN: "test",
      JIRA_EMAIL: "user@test.com",
      JIRA_API_TOKEN: "token",
    },
  };

  const mockClient = {
    getIssueChangelog: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJiraClient.mockReturnValue(mockClient as never);
    mockDb.contributor.upsert.mockImplementation(async (args) => ({
      id: `contributor-${args.create.email}`,
      ...args.create,
    }));
    mockDb.issueStatusTransition.findFirst.mockResolvedValue(null);
  });

  describe("script metadata", () => {
    it("should have correct dataSourceName", () => {
      expect(statusTransitionScript.dataSourceName).toBe("JIRA");
    });

    it("should have correct resource name", () => {
      expect(statusTransitionScript.resource).toBe("status-transition");
    });

    it("should depend on project and issue", () => {
      expect(statusTransitionScript.dependsOn).toEqual(["project", "issue"]);
    });

    it("should have import window of 90 days", () => {
      expect(statusTransitionScript.importWindowDays).toBe(90);
    });
  });

  describe("run", () => {
    it("should create Jira client with context env", async () => {
      mockDb.issue.findMany.mockResolvedValue([]);

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockCreateJiraClient).toHaveBeenCalledWith(mockContext.env);
    });

    it("should fetch issues for the data source within date range", async () => {
      mockDb.issue.findMany.mockResolvedValue([]);

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issue.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            dataSourceId: mockContext.id,
            provider: "JIRA",
            isEnabled: true,
          },
          updatedAt: {
            gte: mockContext.startDate,
            lte: mockContext.endDate,
          },
        },
        select: { id: true, key: true, externalId: true },
      });
    });

    it("should fetch changelog for each issue using issue key", async () => {
      mockDb.issue.findMany.mockResolvedValue([
        { id: "issue-1", key: "PROJ-1", externalId: "10001" },
        { id: "issue-2", key: "PROJ-2", externalId: "10002" },
      ]);
      mockClient.getIssueChangelog.mockResolvedValue({ values: [], total: 0, isLast: true });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockClient.getIssueChangelog).toHaveBeenCalledTimes(2);
      expect(mockClient.getIssueChangelog).toHaveBeenCalledWith("PROJ-1");
      expect(mockClient.getIssueChangelog).toHaveBeenCalledWith("PROJ-2");
    });

    it("should create status transitions for status changes", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: {
              accountId: "user-123",
              displayName: "John Doe",
              emailAddress: "john@example.com",
            },
            items: [
              {
                field: "status",
                fieldtype: "jira",
                fromString: "To Do",
                toString: "In Progress",
              },
            ],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledWith({
        data: {
          issueId: "issue-1",
          fromStatus: "To Do",
          toStatus: "In Progress",
          transitionedAt: new Date("2024-01-15T10:00:00.000Z"),
          authorId: expect.any(String),
        },
      });
    });

    it("should handle status changes identified by fieldId", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [
              {
                field: "Status",
                fieldId: "status",
                fieldtype: "jira",
                fromString: "Done",
                toString: "Reopened",
              },
            ],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledWith({
        data: {
          issueId: "issue-1",
          fromStatus: "Done",
          toStatus: "Reopened",
          transitionedAt: new Date("2024-01-15T10:00:00.000Z"),
          authorId: null,
        },
      });
    });

    it("should skip non-status changes", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [
              {
                field: "summary",
                fieldtype: "jira",
                fromString: "Old title",
                toString: "New title",
              },
              {
                field: "assignee",
                fieldtype: "jira",
                fromString: "John",
                toString: "Jane",
              },
            ],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issueStatusTransition.create).not.toHaveBeenCalled();
    });

    it("should not create duplicate transitions", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });
      mockDb.issueStatusTransition.findFirst.mockResolvedValue({ id: "existing-transition" });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issueStatusTransition.create).not.toHaveBeenCalled();
    });

    it("should handle null fromString in transitions", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [{ field: "status", fromString: null, toString: "To Do" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromStatus: null,
          toStatus: "To Do",
        }),
      });
    });

    it("should update recordsImported count", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [
              { field: "status", fromString: "To Do", toString: "In Progress" },
              { field: "status", fromString: "In Progress", toString: "Done" },
            ],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 2 },
      });
    });

    it("should skip 404 errors silently", async () => {
      mockDb.issue.findMany.mockResolvedValue([
        { id: "issue-1", key: "PROJ-1", externalId: "10001" },
        { id: "issue-2", key: "PROJ-2", externalId: "10002" },
      ]);
      mockClient.getIssueChangelog.mockRejectedValueOnce(new Error("Jira API error: 404 Not Found")).mockResolvedValueOnce({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.importLog.create).not.toHaveBeenCalled();
      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledTimes(1);
    });

    it("should log non-404 errors", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockRejectedValue(new Error("Connection timeout"));

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import transitions for issue PROJ-1: Connection timeout",
          details: null,
        },
      });
    });

    it("should handle non-Error objects in catch", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockRejectedValue("String error");

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import transitions for issue PROJ-1: String error",
          details: null,
        },
      });
    });

    it("should not log errors when none occur", async () => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
      mockClient.getIssueChangelog.mockResolvedValue({ values: [], total: 0, isLast: true });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.importLog.create).not.toHaveBeenCalled();
    });
  });

  describe("contributor handling", () => {
    beforeEach(() => {
      mockDb.issue.findMany.mockResolvedValue([{ id: "issue-1", key: "PROJ-1", externalId: "10001" }]);
    });

    it("should create contributor from changelog author", async () => {
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: {
              accountId: "user-123",
              displayName: "John Doe",
              emailAddress: "john@example.com",
              avatarUrls: { "48x48": "https://avatar.url" },
            },
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.contributor.upsert).toHaveBeenCalledWith({
        where: {
          provider_email: {
            provider: "JIRA",
            email: "john@example.com",
          },
        },
        create: {
          name: "John Doe",
          email: "john@example.com",
          provider: "JIRA",
          username: "user-123",
          providerUserId: "user-123",
          avatarUrl: "https://avatar.url",
        },
        update: {
          name: "John Doe",
          avatarUrl: "https://avatar.url",
        },
      });
    });

    it("should handle author without email", async () => {
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: {
              accountId: "user-123",
              displayName: "John Doe",
            },
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.contributor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            provider_email: {
              provider: "JIRA",
              email: "user-123@jira.local",
            },
          },
        })
      );
    });

    it("should handle null author", async () => {
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: null,
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.contributor.upsert).not.toHaveBeenCalled();
      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: null,
        }),
      });
    });

    it("should handle undefined author", async () => {
      mockClient.getIssueChangelog.mockResolvedValue({
        values: [
          {
            id: "cl-1",
            created: "2024-01-15T10:00:00.000Z",
            author: undefined,
            items: [{ field: "status", fromString: "To Do", toString: "Done" }],
          },
        ],
        total: 1,
        isLast: true,
      });

      await statusTransitionScript.run(mockDb as never, mockContext as never);

      expect(mockDb.contributor.upsert).not.toHaveBeenCalled();
      expect(mockDb.issueStatusTransition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          authorId: null,
        }),
      });
    });
  });
});
