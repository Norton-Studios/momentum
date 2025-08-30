import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

vi.mock("@mmtm/database", () => {
  const mockPrisma = {
    team: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    teamRepository: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
  };
});

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, _res, next) => {
  (req as any).user = {
    id: "test-user-id",
    email: "test@example.com",
    tenantId: "test-tenant-id",
    role: "VIEWER",
  };
  next();
});

app.use(router);

import { prisma } from "@mmtm/database";

describe("Team API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /team", () => {
    it("should create a new team", async () => {
      const mockTeam = {
        id: 1,
        name: "Development Team",
        tenantId: "test-tenant-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.team.create).mockResolvedValue(mockTeam);

      const response = await request(app).post("/team").send({
        name: "Development Team",
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe("Development Team");
      expect(response.body.tenantId).toBe("test-tenant-id");
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(prisma.team.create).toHaveBeenCalledWith({
        data: {
          name: "Development Team",
          tenantId: "test-tenant-id",
        },
      });
    });

    it("should handle missing name in request body", async () => {
      const response = await request(app).post("/team").send({});

      expect(response.status).toBe(200);
      expect(prisma.team.create).toHaveBeenCalledWith({
        data: {
          name: undefined,
          tenantId: "test-tenant-id",
        },
      });
    });
  });

  describe("GET /teams", () => {
    it("should return all teams with repositories", async () => {
      const mockTeams = [
        {
          id: 1,
          name: "Development Team",
          tenantId: "test-tenant-id",
          repositories: [
            {
              id: 1,
              name: "frontend-repo",
              url: "https://github.com/example/frontend",
            },
          ],
        },
        {
          id: 2,
          name: "QA Team",
          tenantId: "test-tenant-id",
          repositories: [],
        },
      ];

      vi.mocked(prisma.team.findMany).mockResolvedValue(mockTeams as any);

      const response = await request(app).get("/teams");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeams);
      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { tenantId: "test-tenant-id" },
        include: { repositories: true },
      });
    });

    it("should return empty array when no teams exist", async () => {
      vi.mocked(prisma.team.findMany).mockResolvedValue([]);

      const response = await request(app).get("/teams");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /team/:id", () => {
    it("should return a specific team with repositories", async () => {
      const mockTeam = {
        id: 1,
        name: "Development Team",
        tenantId: "test-tenant-id",
        repositories: [
          {
            id: 1,
            name: "frontend-repo",
            url: "https://github.com/example/frontend",
          },
        ],
      };

      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam as any);

      const response = await request(app).get("/team/1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTeam);
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        include: { repositories: true },
      });
    });

    it("should return 404 when team not found", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).get("/team/999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: 999,
          tenantId: "test-tenant-id",
        },
        include: { repositories: true },
      });
    });

    it("should handle invalid team ID", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).get("/team/invalid");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: NaN,
          tenantId: "test-tenant-id",
        },
        include: { repositories: true },
      });
    });

    it("should ensure tenant isolation", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).get("/team/1");

      expect(response.status).toBe(404);
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        include: { repositories: true },
      });
    });
  });

  describe("PUT /team/:id", () => {
    it("should update a team successfully", async () => {
      const mockUpdatedTeam = {
        id: 1,
        name: "Updated Team Name",
        tenantId: "test-tenant-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.team.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockUpdatedTeam);

      const response = await request(app).put("/team/1").send({
        name: "Updated Team Name",
      });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe("Updated Team Name");
      expect(response.body.tenantId).toBe("test-tenant-id");
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(prisma.team.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        data: { name: "Updated Team Name" },
      });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantId: "test-tenant-id" },
      });
    });

    it("should return 404 when team not found for update", async () => {
      vi.mocked(prisma.team.updateMany).mockResolvedValue({ count: 0 });

      const response = await request(app).put("/team/999").send({
        name: "Updated Team Name",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.updateMany).toHaveBeenCalledWith({
        where: {
          id: 999,
          tenantId: "test-tenant-id",
        },
        data: { name: "Updated Team Name" },
      });
      expect(prisma.team.findFirst).not.toHaveBeenCalled();
    });

    it("should handle invalid team ID for update", async () => {
      vi.mocked(prisma.team.updateMany).mockResolvedValue({ count: 0 });

      const response = await request(app).put("/team/invalid").send({
        name: "Updated Team Name",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.updateMany).toHaveBeenCalledWith({
        where: {
          id: NaN,
          tenantId: "test-tenant-id",
        },
        data: { name: "Updated Team Name" },
      });
    });

    it("should ensure tenant isolation for updates", async () => {
      vi.mocked(prisma.team.updateMany).mockResolvedValue({ count: 0 });

      const response = await request(app).put("/team/1").send({
        name: "Updated Team Name",
      });

      expect(response.status).toBe(404);
      expect(prisma.team.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        data: { name: "Updated Team Name" },
      });
    });
  });

  describe("DELETE /team/:id", () => {
    it("should delete a team successfully", async () => {
      const mockTeam = {
        id: 1,
        name: "Team to Delete",
        tenantId: "test-tenant-id",
      };

      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamRepository.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.team.delete).mockResolvedValue(mockTeam);

      const response = await request(app).delete("/team/1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Team deleted" });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantId: "test-tenant-id" },
      });
      expect(prisma.teamRepository.deleteMany).toHaveBeenCalledWith({
        where: { teamId: 1 },
      });
      expect(prisma.team.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return 404 when team not found for deletion", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).delete("/team/999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: 999, tenantId: "test-tenant-id" },
      });
      expect(prisma.teamRepository.deleteMany).not.toHaveBeenCalled();
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it("should handle invalid team ID for deletion", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).delete("/team/invalid");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Team not found" });
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: NaN, tenantId: "test-tenant-id" },
      });
    });

    it("should ensure tenant isolation for deletion", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      const response = await request(app).delete("/team/1");

      expect(response.status).toBe(404);
      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantId: "test-tenant-id" },
      });
    });

    it("should clean up team repositories before deleting team", async () => {
      const mockTeam = {
        id: 1,
        name: "Team to Delete",
        tenantId: "test-tenant-id",
      };

      vi.mocked(prisma.team.findFirst).mockResolvedValue(mockTeam);
      vi.mocked(prisma.teamRepository.deleteMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.team.delete).mockResolvedValue(mockTeam);

      const response = await request(app).delete("/team/1");

      expect(response.status).toBe(200);
      expect(prisma.teamRepository.deleteMany).toHaveBeenCalledBefore(prisma.team.delete as any);
    });
  });

  describe("POST /team/:teamId/repository/:repositoryId", () => {
    it("should add repository to team successfully", async () => {
      const mockTeamRepository = {
        teamId: 1,
        repositoryId: 2,
        createdAt: new Date(),
      };

      vi.mocked(prisma.teamRepository.create).mockResolvedValue(mockTeamRepository);

      const response = await request(app).post("/team/1/repository/2");

      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe(1);
      expect(response.body.repositoryId).toBe(2);
      expect(response.body.createdAt).toBeDefined();
      expect(prisma.teamRepository.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          repositoryId: 2,
        },
      });
    });

    it("should handle invalid team ID for repository addition", async () => {
      const mockTeamRepository = {
        teamId: null,
        repositoryId: 2,
        createdAt: new Date(),
      };

      vi.mocked(prisma.teamRepository.create).mockResolvedValue(mockTeamRepository);

      const response = await request(app).post("/team/invalid/repository/2");

      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe(null);
      expect(response.body.repositoryId).toBe(2);
      expect(response.body.createdAt).toBeDefined();
      expect(prisma.teamRepository.create).toHaveBeenCalledWith({
        data: {
          teamId: NaN,
          repositoryId: 2,
        },
      });
    });

    it("should handle invalid repository ID for repository addition", async () => {
      const mockTeamRepository = {
        teamId: 1,
        repositoryId: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.teamRepository.create).mockResolvedValue(mockTeamRepository);

      const response = await request(app).post("/team/1/repository/invalid");

      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe(1);
      expect(response.body.repositoryId).toBe(null);
      expect(response.body.createdAt).toBeDefined();
      expect(prisma.teamRepository.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          repositoryId: NaN,
        },
      });
    });

    it("should handle database errors when adding repository to team", async () => {
      const error = new Error("Database constraint violation");
      vi.mocked(prisma.teamRepository.create).mockRejectedValue(error);

      const response = await request(app).post("/team/1/repository/2");

      expect(response.status).toBe(500);
      expect(prisma.teamRepository.create).toHaveBeenCalledWith({
        data: {
          teamId: 1,
          repositoryId: 2,
        },
      });
    });
  });

  describe("DELETE /team/:teamId/repository/:repositoryId", () => {
    it("should remove repository from team successfully", async () => {
      vi.mocked(prisma.teamRepository.delete).mockResolvedValue({
        teamId: 1,
        repositoryId: 2,
      });

      const response = await request(app).delete("/team/1/repository/2");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Repository removed from team" });
      expect(prisma.teamRepository.delete).toHaveBeenCalledWith({
        where: {
          teamId_repositoryId: {
            teamId: 1,
            repositoryId: 2,
          },
        },
      });
    });

    it("should handle invalid team ID for repository removal", async () => {
      vi.mocked(prisma.teamRepository.delete).mockResolvedValue({
        teamId: null,
        repositoryId: 2,
      });

      const response = await request(app).delete("/team/invalid/repository/2");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Repository removed from team" });
      expect(prisma.teamRepository.delete).toHaveBeenCalledWith({
        where: {
          teamId_repositoryId: {
            teamId: NaN,
            repositoryId: 2,
          },
        },
      });
    });

    it("should handle invalid repository ID for repository removal", async () => {
      vi.mocked(prisma.teamRepository.delete).mockResolvedValue({
        teamId: 1,
        repositoryId: null,
      });

      const response = await request(app).delete("/team/1/repository/invalid");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Repository removed from team" });
      expect(prisma.teamRepository.delete).toHaveBeenCalledWith({
        where: {
          teamId_repositoryId: {
            teamId: 1,
            repositoryId: NaN,
          },
        },
      });
    });

    it("should handle database errors when removing repository from team", async () => {
      const error = new Error("Record not found");
      vi.mocked(prisma.teamRepository.delete).mockRejectedValue(error);

      const response = await request(app).delete("/team/1/repository/2");

      expect(response.status).toBe(500);
      expect(prisma.teamRepository.delete).toHaveBeenCalledWith({
        where: {
          teamId_repositoryId: {
            teamId: 1,
            repositoryId: 2,
          },
        },
      });
    });
  });

  describe("Error handling", () => {
    it("should handle database errors on team creation", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.team.create).mockRejectedValue(error);

      const response = await request(app).post("/team").send({
        name: "Test Team",
      });

      expect(response.status).toBe(500);
    });

    it("should handle database errors on team listing", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.team.findMany).mockRejectedValue(error);

      const response = await request(app).get("/teams");

      expect(response.status).toBe(500);
    });

    it("should handle database errors on team retrieval", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.team.findFirst).mockRejectedValue(error);

      const response = await request(app).get("/team/1");

      expect(response.status).toBe(500);
    });

    it("should handle database errors on team update", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.team.updateMany).mockRejectedValue(error);

      const response = await request(app).put("/team/1").send({
        name: "Updated Team",
      });

      expect(response.status).toBe(500);
    });

    it("should handle database errors on team deletion", async () => {
      const error = new Error("Database connection failed");
      vi.mocked(prisma.team.findFirst).mockRejectedValue(error);

      const response = await request(app).delete("/team/1");

      expect(response.status).toBe(500);
    });
  });

  describe("Tenant isolation", () => {
    it("should always include tenantId in team queries", async () => {
      vi.mocked(prisma.team.findMany).mockResolvedValue([]);

      await request(app).get("/teams");

      expect(prisma.team.findMany).toHaveBeenCalledWith({
        where: { tenantId: "test-tenant-id" },
        include: { repositories: true },
      });
    });

    it("should always include tenantId in single team queries", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      await request(app).get("/team/1");

      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        include: { repositories: true },
      });
    });

    it("should always include tenantId in team updates", async () => {
      vi.mocked(prisma.team.updateMany).mockResolvedValue({ count: 0 });

      await request(app).put("/team/1").send({ name: "Updated" });

      expect(prisma.team.updateMany).toHaveBeenCalledWith({
        where: {
          id: 1,
          tenantId: "test-tenant-id",
        },
        data: { name: "Updated" },
      });
    });

    it("should always include tenantId in team deletion verification", async () => {
      vi.mocked(prisma.team.findFirst).mockResolvedValue(null);

      await request(app).delete("/team/1");

      expect(prisma.team.findFirst).toHaveBeenCalledWith({
        where: { id: 1, tenantId: "test-tenant-id" },
      });
    });

    it("should create teams with correct tenantId", async () => {
      const mockTeam = { id: 1, name: "Test Team", tenantId: "test-tenant-id" };
      vi.mocked(prisma.team.create).mockResolvedValue(mockTeam);

      await request(app).post("/team").send({ name: "Test Team" });

      expect(prisma.team.create).toHaveBeenCalledWith({
        data: {
          name: "Test Team",
          tenantId: "test-tenant-id",
        },
      });
    });
  });
});
