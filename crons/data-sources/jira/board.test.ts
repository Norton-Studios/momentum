import { beforeEach, describe, expect, it, vi } from "vitest";
import { boardScript } from "./board.js";

vi.mock("./client.js", () => ({
  createJiraClient: vi.fn(),
}));

import { createJiraClient } from "./client.js";

const mockCreateJiraClient = vi.mocked(createJiraClient);

describe("boardScript", () => {
  const mockDb = {
    project: {
      findMany: vi.fn(),
    },
    board: {
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
    getBoards: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJiraClient.mockReturnValue(mockClient as never);
  });

  describe("script metadata", () => {
    it("should have correct dataSourceName", () => {
      expect(boardScript.dataSourceName).toBe("JIRA");
    });

    it("should have correct resource name", () => {
      expect(boardScript.resource).toBe("board");
    });

    it("should depend on project", () => {
      expect(boardScript.dependsOn).toEqual(["project"]);
    });

    it("should have import window of 90 days", () => {
      expect(boardScript.importWindowDays).toBe(90);
    });
  });

  describe("run", () => {
    it("should create Jira client with context env", async () => {
      mockDb.project.findMany.mockResolvedValue([]);

      await boardScript.run(mockDb as never, mockContext);

      expect(mockCreateJiraClient).toHaveBeenCalledWith(mockContext.env);
    });

    it("should fetch projects for the data source", async () => {
      mockDb.project.findMany.mockResolvedValue([]);

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.project.findMany).toHaveBeenCalledWith({
        where: {
          dataSourceId: mockContext.id,
          provider: "JIRA",
          isEnabled: true,
        },
        select: { id: true, key: true },
      });
    });

    it("should fetch boards for each project", async () => {
      mockDb.project.findMany.mockResolvedValue([
        { id: "proj-1", key: "PROJ1" },
        { id: "proj-2", key: "PROJ2" },
      ]);
      mockClient.getBoards.mockResolvedValue([]);

      await boardScript.run(mockDb as never, mockContext);

      expect(mockClient.getBoards).toHaveBeenCalledTimes(2);
      expect(mockClient.getBoards).toHaveBeenCalledWith("PROJ1");
      expect(mockClient.getBoards).toHaveBeenCalledWith("PROJ2");
    });

    it("should create new boards when they don't exist", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockResolvedValue([
        { id: 101, name: "Sprint Board", type: "scrum" },
        { id: 102, name: "Kanban Board", type: "kanban" },
      ]);
      mockDb.board.findFirst.mockResolvedValue(null);

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.board.create).toHaveBeenCalledTimes(2);
      expect(mockDb.board.create).toHaveBeenCalledWith({
        data: {
          projectId: "proj-1",
          name: "Sprint Board",
          externalId: "101",
          boardType: "scrum",
        },
      });
      expect(mockDb.board.create).toHaveBeenCalledWith({
        data: {
          projectId: "proj-1",
          name: "Kanban Board",
          externalId: "102",
          boardType: "kanban",
        },
      });
    });

    it("should update existing boards", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockResolvedValue([{ id: 101, name: "Updated Board Name", type: "scrum" }]);
      mockDb.board.findFirst.mockResolvedValue({ id: "board-1" });

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.board.update).toHaveBeenCalledWith({
        where: { id: "board-1" },
        data: {
          name: "Updated Board Name",
          boardType: "scrum",
        },
      });
      expect(mockDb.board.create).not.toHaveBeenCalled();
    });

    it("should update recordsImported count", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockResolvedValue([
        { id: 101, name: "Board 1", type: "scrum" },
        { id: 102, name: "Board 2", type: "kanban" },
      ]);
      mockDb.board.findFirst.mockResolvedValue(null);

      await boardScript.run(mockDb as never, mockContext);

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
      mockClient.getBoards.mockRejectedValueOnce(new Error("API rate limit")).mockResolvedValueOnce([{ id: 201, name: "Board", type: "scrum" }]);
      mockDb.board.findFirst.mockResolvedValue(null);

      await boardScript.run(mockDb as never, mockContext);

      // Should still process second project
      expect(mockDb.board.create).toHaveBeenCalledTimes(1);
      expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
        where: { id: mockContext.runId },
        data: { recordsImported: 1 },
      });
    });

    it("should log errors when they occur", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockRejectedValue(new Error("Connection timeout"));

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import boards for project PROJ1: Connection timeout",
          details: null,
        },
      });
    });

    it("should handle non-Error objects in catch", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockRejectedValue("String error");

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).toHaveBeenCalledWith({
        data: {
          dataSourceRunId: mockContext.runId,
          level: "ERROR",
          message: "Failed to import boards for project PROJ1: String error",
          details: null,
        },
      });
    });

    it("should not log errors when none occur", async () => {
      mockDb.project.findMany.mockResolvedValue([{ id: "proj-1", key: "PROJ1" }]);
      mockClient.getBoards.mockResolvedValue([{ id: 101, name: "Board", type: "scrum" }]);
      mockDb.board.findFirst.mockResolvedValue(null);

      await boardScript.run(mockDb as never, mockContext);

      expect(mockDb.importLog.create).not.toHaveBeenCalled();
    });
  });
});
