import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueScript } from "./issue.js";

vi.mock("./client.js", () => ({
  createJiraClient: vi.fn(),
  formatJiraDate: vi.fn((date: Date) => date.toISOString().split("T")[0]),
}));

import { createJiraClient } from "./client.js";

const mockCreateJiraClient = vi.mocked(createJiraClient);

describe("issueScript", () => {
  const mockDb = {
    project: {
      findMany: vi.fn(),
    },
    board: {
      findFirst: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
    },
    issue: {
      upsert: vi.fn(),
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
    baseUrl: "https://test.atlassian.net",
    getAllIssues: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJiraClient.mockReturnValue(mockClient as never);
    mockDb.board.findFirst.mockResolvedValue(null);
    mockDb.sprint.findFirst.mockResolvedValue(null);
    mockDb.contributor.upsert.mockImplementation(async (args) => ({
      id: `contributor-${args.create.email}`,
      ...args.create,
    }));
  });

  describe("script metadata", () => {
    it("should have correct dataSourceName", () => {
      expect(issueScript.dataSourceName).toBe("JIRA");
    });

    it("should have correct resource name", () => {
      expect(issueScript.resource).toBe("issue");
    });

    it("should depend on project, board, and sprint", () => {
      expect(issueScript.dependsOn).toEqual(["project", "board", "sprint"]);
    });

    it("should have import window of 90 days", () => {
      expect(issueScript.importWindowDays).toBe(90);
    });
  });

  describe("run", () => {
    it("should create Jira client with context env", async () => {
      mockDb.project.findMany.mockResolvedValue([]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockCreateJiraClient).toHaveBeenCalledWith(mockContext.env);
    });

    it("should fetch projects for the data source", async () => {
      mockDb.project.findMany.mockResolvedValue([]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.project.findMany).toHaveBeenCalledWith({
        where: {
          dataSourceId: mockContext.id,
          provider: "JIRA",
          isEnabled: true,
        },
        select: { id: true, key: true },
      });
    });

    it("should search issues with correct JQL for each project", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockResolvedValue([]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockClient.getAllIssues).toHaveBeenCalledWith(expect.stringContaining('project = "PROJ"'), expect.any(Array));
    });

    it("should upsert issues with correct data", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          self: "https://test.atlassian.net/rest/api/3/issue/10001",
          fields: {
            summary: "Test Issue",
            description: "Test description",
            issuetype: { id: "10001", name: "Story" },
            status: { id: "1", name: "To Do", statusCategory: { key: "new" } },
            priority: { id: "3", name: "Medium" },
            assignee: null,
            reporter: null,
            created: "2024-01-15T10:00:00.000Z",
            updated: "2024-01-16T10:00:00.000Z",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "PROJ-1" },
          create: expect.objectContaining({
            projectId: "proj-1",
            key: "PROJ-1",
            externalId: "10001",
            title: "Test Issue",
            type: "STORY",
            status: "TODO",
            priority: "MEDIUM",
          }),
        })
      );
    });

    it("should handle issues with assignee and reporter", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          self: "https://test.atlassian.net/rest/api/3/issue/10001",
          fields: {
            summary: "Test Issue",
            issuetype: { id: "10001", name: "Task" },
            status: { id: "1", name: "In Progress" },
            assignee: {
              accountId: "user-123",
              displayName: "John Doe",
              emailAddress: "john@example.com",
              avatarUrls: { "48x48": "https://avatar.url" },
            },
            reporter: {
              accountId: "user-456",
              displayName: "Jane Doe",
              emailAddress: "jane@example.com",
            },
            created: "2024-01-15T10:00:00.000Z",
            updated: "2024-01-16T10:00:00.000Z",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.contributor.upsert).toHaveBeenCalledTimes(2);
    });

    it("should link issues to boards when available", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockDb.board.findFirst.mockResolvedValue({ id: "board-1" });
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          self: "https://test.atlassian.net/rest/api/3/issue/10001",
          fields: {
            summary: "Test Issue",
            issuetype: { id: "10001", name: "Task" },
            status: { id: "1", name: "Done" },
            created: "2024-01-15T10:00:00.000Z",
            updated: "2024-01-16T10:00:00.000Z",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            boardId: "board-1",
          }),
        })
      );
    });

    it("should link issues to sprints when available", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockDb.sprint.findFirst.mockResolvedValue({ id: "sprint-1" });
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          self: "https://test.atlassian.net/rest/api/3/issue/10001",
          fields: {
            summary: "Test Issue",
            issuetype: { id: "10001", name: "Task" },
            status: { id: "1", name: "Done" },
            customfield_10020: [{ id: 1001 }],
            created: "2024-01-15T10:00:00.000Z",
            updated: "2024-01-16T10:00:00.000Z",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sprintId: "sprint-1",
          }),
        })
      );
    });

    it("should extract story points from customfield_10016", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          self: "https://test.atlassian.net/rest/api/3/issue/10001",
          fields: {
            summary: "Test Issue",
            issuetype: { id: "10001", name: "Story" },
            status: { id: "1", name: "Done" },
            customfield_10016: 5,
            created: "2024-01-15T10:00:00.000Z",
            updated: "2024-01-16T10:00:00.000Z",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            storyPoints: 5,
          }),
        })
      );
    });

    it("should update recordsImported count", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: { summary: "Issue 1", issuetype: { name: "Task" }, status: { name: "Done" }, created: "", updated: "" },
        },
        {
          id: "10002",
          key: "PROJ-2",
          fields: { summary: "Issue 2", issuetype: { name: "Task" }, status: { name: "Done" }, created: "", updated: "" },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 2 },
      });
    });

    it("should handle errors for individual projects and continue", async () => {
      mockDb.project.findMany.mockResolvedValue([
        { id: "proj-1", key: "PROJ1" },
        { id: "proj-2", key: "PROJ2" },
      ]);
      mockClient.getAllIssues.mockRejectedValueOnce(new Error("API error")).mockResolvedValueOnce([
        {
          id: "20001",
          key: "PROJ2-1",
          fields: { summary: "Issue", issuetype: { name: "Task" }, status: { name: "Done" }, created: "", updated: "" },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledTimes(1);
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 1 },
      });
    });

    it("should log errors when they occur", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
      mockClient.getAllIssues.mockRejectedValue(new Error("Timeout"));

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import issues for project PROJ: Timeout",
          details: null,
        },
      });
    });
  });

  describe("issue type mapping", () => {
    beforeEach(() => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
    });

    const testIssueTypeMapping = async (jiraType: string, expectedType: string) => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: { summary: "Test", issuetype: { id: "1", name: jiraType }, status: { name: "Done" }, created: "", updated: "" },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ type: expectedType }),
        })
      );
    };

    it("should map Bug type", async () => {
      await testIssueTypeMapping("Bug", "BUG");
    });

    it("should map Epic type", async () => {
      await testIssueTypeMapping("Epic", "EPIC");
    });

    it("should map Story type", async () => {
      await testIssueTypeMapping("Story", "STORY");
    });

    it("should map Sub-task type", async () => {
      await testIssueTypeMapping("Sub-task", "SUBTASK");
    });

    it("should map Feature type", async () => {
      await testIssueTypeMapping("Feature", "FEATURE");
    });

    it("should map Enhancement to FEATURE", async () => {
      await testIssueTypeMapping("Enhancement", "FEATURE");
    });

    it("should default to TASK for unknown types", async () => {
      await testIssueTypeMapping("Unknown Type", "TASK");
    });
  });

  describe("issue status mapping", () => {
    beforeEach(() => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
    });

    const testIssueStatusMapping = async (statusName: string, statusCategory: string | undefined, expectedStatus: string) => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: statusName, statusCategory: statusCategory ? { key: statusCategory } : undefined },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: expectedStatus }),
        })
      );
    };

    it("should map done category to DONE", async () => {
      await testIssueStatusMapping("Completed", "done", "DONE");
    });

    it("should map indeterminate category to IN_PROGRESS", async () => {
      await testIssueStatusMapping("Working", "indeterminate", "IN_PROGRESS");
    });

    it("should map Done status name to DONE", async () => {
      await testIssueStatusMapping("Done", undefined, "DONE");
    });

    it("should map Closed status name to DONE", async () => {
      await testIssueStatusMapping("Closed", undefined, "DONE");
    });

    it("should map In Progress status name to IN_PROGRESS", async () => {
      await testIssueStatusMapping("In Progress", undefined, "IN_PROGRESS");
    });

    it("should map In Review status name to IN_REVIEW", async () => {
      await testIssueStatusMapping("In Review", undefined, "IN_REVIEW");
    });

    it("should map Testing status name to IN_REVIEW", async () => {
      await testIssueStatusMapping("Testing", undefined, "IN_REVIEW");
    });

    it("should map Blocked status name to BLOCKED", async () => {
      await testIssueStatusMapping("Blocked", undefined, "BLOCKED");
    });

    it("should map Cancelled status name to CANCELLED", async () => {
      await testIssueStatusMapping("Cancelled", undefined, "CANCELLED");
    });

    it("should default to TODO for unknown status", async () => {
      await testIssueStatusMapping("New", undefined, "TODO");
    });
  });

  describe("issue priority mapping", () => {
    beforeEach(() => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
    });

    const testIssuePriorityMapping = async (priorityName: string | undefined, expectedPriority: string) => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            priority: priorityName ? { id: "1", name: priorityName } : undefined,
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ priority: expectedPriority }),
        })
      );
    };

    it("should map Highest to CRITICAL", async () => {
      await testIssuePriorityMapping("Highest", "CRITICAL");
    });

    it("should map Critical to CRITICAL", async () => {
      await testIssuePriorityMapping("Critical", "CRITICAL");
    });

    it("should map Blocker to CRITICAL", async () => {
      await testIssuePriorityMapping("Blocker", "CRITICAL");
    });

    it("should map High to HIGH", async () => {
      await testIssuePriorityMapping("High", "HIGH");
    });

    it("should map Low to LOW", async () => {
      await testIssuePriorityMapping("Low", "LOW");
    });

    it("should map Lowest to LOW (contains 'low')", async () => {
      // Note: "Lowest" contains "low" so it matches LOW before TRIVIAL
      await testIssuePriorityMapping("Lowest", "LOW");
    });

    it("should map Trivial to TRIVIAL", async () => {
      await testIssuePriorityMapping("Trivial", "TRIVIAL");
    });

    it("should default to MEDIUM for unknown priority", async () => {
      await testIssuePriorityMapping("Normal", "MEDIUM");
    });

    it("should default to MEDIUM when priority is undefined", async () => {
      await testIssuePriorityMapping(undefined, "MEDIUM");
    });
  });

  describe("description extraction", () => {
    beforeEach(() => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
    });

    it("should handle string descriptions", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            description: "Plain text description",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: "Plain text description",
          }),
        })
      );
    });

    it("should handle ADF document descriptions", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            description: {
              type: "doc",
              version: 1,
              content: [{ type: "paragraph", content: [{ type: "text", text: "ADF content" }] }],
            },
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: "ADF content",
          }),
        })
      );
    });

    it("should handle null descriptions", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            description: null,
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.issue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            description: null,
          }),
        })
      );
    });
  });

  describe("contributor handling", () => {
    beforeEach(() => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ" }]);
    });

    it("should create contributor with email when available", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            assignee: {
              accountId: "user-123",
              displayName: "John Doe",
              emailAddress: "john@example.com",
            },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.contributor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            provider_email: {
              provider: "JIRA",
              email: "john@example.com",
            },
          },
          create: expect.objectContaining({
            name: "John Doe",
            email: "john@example.com",
            provider: "JIRA",
          }),
        })
      );
    });

    it("should generate email from accountId when email not available", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            assignee: {
              accountId: "user-123",
              displayName: "John Doe",
            },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

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

    it("should handle users without email, accountId, or key", async () => {
      mockClient.getAllIssues.mockResolvedValue([
        {
          id: "10001",
          key: "PROJ-1",
          fields: {
            summary: "Test",
            issuetype: { id: "1", name: "Task" },
            status: { id: "1", name: "Done" },
            assignee: {
              name: "johndoe",
              displayName: "John Doe",
            },
            created: "",
            updated: "",
          },
        },
      ]);

      await issueScript.run(mockDb as never, mockContext);

      expect(mockDb.contributor.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            provider_email: {
              provider: "JIRA",
              email: "johndoe@jira.local",
            },
          },
        })
      );
    });
  });
});
