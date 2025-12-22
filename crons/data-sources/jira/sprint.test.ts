import { beforeEach, describe, expect, it, vi } from "vitest";
import { sprintScript } from "./sprint.js";

vi.mock("./client.js", () => ({
  createJiraClient: vi.fn(),
}));

import { createJiraClient } from "./client.js";

const mockCreateJiraClient = vi.mocked(createJiraClient);

describe("sprintScript", () => {
  const mockDb = {
    board: {
      findMany: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
    getSprints: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJiraClient.mockReturnValue(mockClient as never);
  });

  describe("script metadata", () => {
    it("should have correct dataSourceName", () => {
      expect(sprintScript.dataSourceName).toBe("JIRA");
    });

    it("should have correct resource name", () => {
      expect(sprintScript.resource).toBe("sprint");
    });

    it("should depend on project and board", () => {
      expect(sprintScript.dependsOn).toEqual(["project", "board"]);
    });

    it("should have import window of 90 days", () => {
      expect(sprintScript.importWindowDays).toBe(90);
    });
  });

  describe("run", () => {
    it("should create Jira client with context env", async () => {
      mockDb.board.findMany.mockResolvedValue([]);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockCreateJiraClient).toHaveBeenCalledWith(mockContext.env);
    });

    it("should fetch scrum boards for the data source", async () => {
      mockDb.board.findMany.mockResolvedValue([]);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.board.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            dataSourceId: mockContext.id,
            provider: "JIRA",
            isEnabled: true,
          },
          boardType: "scrum",
        },
        select: { id: true, externalId: true, projectId: true },
      });
    });

    it("should skip boards without externalId", async () => {
      mockDb.board.findMany.mockResolvedValue([
        { id: "board-1", externalId: null, projectId: "proj-1" },
        { id: "board-2", externalId: "101", projectId: "proj-2" },
      ]);
      mockClient.getSprints.mockResolvedValue([]);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockClient.getSprints).toHaveBeenCalledTimes(1);
      expect(mockClient.getSprints).toHaveBeenCalledWith(101);
    });

    it("should fetch sprints for each board", async () => {
      mockDb.board.findMany.mockResolvedValue([
        { id: "board-1", externalId: "101", projectId: "proj-1" },
        { id: "board-2", externalId: "102", projectId: "proj-2" },
      ]);
      mockClient.getSprints.mockResolvedValue([]);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockClient.getSprints).toHaveBeenCalledTimes(2);
      expect(mockClient.getSprints).toHaveBeenCalledWith(101);
      expect(mockClient.getSprints).toHaveBeenCalledWith(102);
    });

    it("should create new sprints when they don't exist", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockResolvedValue([
        {
          id: 1001,
          name: "Sprint 1",
          state: "active",
          goal: "Complete feature X",
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-14T00:00:00.000Z",
          completeDate: null,
        },
      ]);
      mockDb.sprint.findFirst.mockResolvedValue(null);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.sprint.create).toHaveBeenCalledWith({
        data: {
          projectId: "proj-1",
          boardId: "board-1",
          name: "Sprint 1",
          externalId: "1001",
          goal: "Complete feature X",
          state: "active",
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: new Date("2024-01-14T00:00:00.000Z"),
          completedAt: null,
        },
      });
    });

    it("should update existing sprints", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockResolvedValue([
        {
          id: 1001,
          name: "Sprint 1 - Updated",
          state: "closed",
          goal: "Updated goal",
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-14T00:00:00.000Z",
          completeDate: "2024-01-15T00:00:00.000Z",
        },
      ]);
      mockDb.sprint.findFirst.mockResolvedValue({ id: "sprint-1" });

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.sprint.update).toHaveBeenCalledWith({
        where: { id: "sprint-1" },
        data: {
          name: "Sprint 1 - Updated",
          goal: "Updated goal",
          state: "closed",
          startDate: new Date("2024-01-01T00:00:00.000Z"),
          endDate: new Date("2024-01-14T00:00:00.000Z"),
          completedAt: new Date("2024-01-15T00:00:00.000Z"),
        },
      });
      expect(mockDb.sprint.create).not.toHaveBeenCalled();
    });

    it("should use default dates when not provided", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockResolvedValue([
        {
          id: 1001,
          name: "Sprint Without Dates",
          state: "future",
          goal: null,
        },
      ]);
      mockDb.sprint.findFirst.mockResolvedValue(null);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.sprint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Sprint Without Dates",
            state: "future",
          }),
        })
      );
    });

    it("should update recordsImported count", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockResolvedValue([
        { id: 1001, name: "Sprint 1", state: "active" },
        { id: 1002, name: "Sprint 2", state: "closed" },
      ]);
      mockDb.sprint.findFirst.mockResolvedValue(null);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 2 },
      });
    });

    it("should handle errors for individual boards and continue", async () => {
      mockDb.board.findMany.mockResolvedValue([
        { id: "board-1", externalId: "101", projectId: "proj-1" },
        { id: "board-2", externalId: "102", projectId: "proj-2" },
      ]);
      mockClient.getSprints.mockRejectedValueOnce(new Error("Board not found")).mockResolvedValueOnce([{ id: 2001, name: "Sprint", state: "active" }]);
      mockDb.sprint.findFirst.mockResolvedValue(null);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.sprint.create).toHaveBeenCalledTimes(1);
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 1 },
      });
    });

    it("should log errors when they occur", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockRejectedValue(new Error("Permission denied"));

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import sprints for board 101: Permission denied",
          details: null,
        },
      });
    });

    it("should handle non-Error objects in catch", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockRejectedValue("String error");

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import sprints for board 101: String error",
          details: null,
        },
      });
    });

    it("should not log errors when none occur", async () => {
      mockDb.board.findMany.mockResolvedValue([{ id: "board-1", externalId: "101", projectId: "proj-1" }]);
      mockClient.getSprints.mockResolvedValue([{ id: 1001, name: "Sprint", state: "active" }]);
      mockDb.sprint.findFirst.mockResolvedValue(null);

      await sprintScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).not.toHaveBeenCalled();
    });
  });
});
