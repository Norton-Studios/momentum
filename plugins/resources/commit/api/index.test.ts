import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

vi.mock("@developer-productivity/database", () => {
  const mockPrisma = {
    commit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
  };
});

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  (req as any).user = {
    id: "test-user-id",
    email: "test@example.com",
    tenantId: "test-tenant-id",
    isAdmin: false,
  };
  next();
});

app.use(router);

import { prisma } from "@developer-productivity/database";

describe("Commit API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /commit", () => {
    it("should create a new commit", async () => {
      const mockCommit = {
        id: "1",
        externalId: "ext-1",
        repositoryId: "repo-1",
        sha: "abc123",
        message: "Initial commit",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        authorDate: new Date("2024-01-01"),
        committerName: "John Doe",
        committerEmail: "john@example.com",
        committerDate: new Date("2024-01-01"),
        url: "https://github.com/org/repo/commit/abc123",
        additions: 10,
        deletions: 5,
        changedFiles: 3,
        parentShas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.commit.create).mockResolvedValue(mockCommit);

      const response = await request(app).post("/commit").send({
        externalId: "ext-1",
        repositoryId: "repo-1",
        sha: "abc123",
        message: "Initial commit",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        authorDate: "2024-01-01",
        committerName: "John Doe",
        committerEmail: "john@example.com",
        committerDate: "2024-01-01",
        url: "https://github.com/org/repo/commit/abc123",
        additions: 10,
        deletions: 5,
        changedFiles: 3,
        parentShas: [],
      });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(mockCommit.id);
      expect(response.body.sha).toBe(mockCommit.sha);
      expect(response.body.message).toBe(mockCommit.message);
      expect(response.body.additions).toBe(mockCommit.additions);
      expect(prisma.commit.create).toHaveBeenCalledOnce();
    });
  });

  describe("GET /commits", () => {
    it("should return all commits", async () => {
      const mockCommits = [
        { id: "1", sha: "abc123", message: "Commit 1" },
        { id: "2", sha: "def456", message: "Commit 2" },
      ];

      vi.mocked(prisma.commit.findMany).mockResolvedValue(mockCommits as any);

      const response = await request(app).get("/commits");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCommits);
      expect(prisma.commit.findMany).toHaveBeenCalledWith({
        include: { repository: true },
        where: { tenantId: "test-tenant-id" },
      });
    });
  });

  describe("GET /repositories/:repositoryId/commits", () => {
    it("should return commits for a specific repository", async () => {
      const mockCommits = [
        { id: "1", sha: "abc123", message: "Commit 1", repositoryId: "repo-1" },
        { id: "2", sha: "def456", message: "Commit 2", repositoryId: "repo-1" },
      ];

      vi.mocked(prisma.commit.findMany).mockResolvedValue(mockCommits as any);

      const response = await request(app).get("/repositories/repo-1/commits");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCommits);
      expect(prisma.commit.findMany).toHaveBeenCalledWith({
        where: { repositoryId: "repo-1", tenantId: "test-tenant-id" },
        orderBy: { authorDate: "desc" },
      });
    });
  });

  describe("GET /commits/:id", () => {
    it("should return a specific commit", async () => {
      const mockCommit = { id: "1", sha: "abc123", message: "Test commit" };
      vi.mocked(prisma.commit.findUnique).mockResolvedValue(mockCommit as any);

      const response = await request(app).get("/commits/1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCommit);
      expect(prisma.commit.findUnique).toHaveBeenCalledWith({
        where: { id: "1", tenantId: "test-tenant-id" },
        include: { repository: true },
      });
    });

    it("should return 404 if commit not found", async () => {
      vi.mocked(prisma.commit.findUnique).mockResolvedValue(null);

      const response = await request(app).get("/commits/999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Commit not found" });
    });
  });

  describe("GET /commits/sha/:sha", () => {
    it("should return a commit by SHA", async () => {
      const mockCommit = { id: "1", sha: "abc123", message: "Test commit" };
      vi.mocked(prisma.commit.findUnique).mockResolvedValue(mockCommit as any);

      const response = await request(app).get("/commits/sha/abc123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCommit);
      expect(prisma.commit.findUnique).toHaveBeenCalledWith({
        where: { sha: "abc123", tenantId: "test-tenant-id" },
        include: { repository: true },
      });
    });

    it("should return 404 if commit not found by SHA", async () => {
      vi.mocked(prisma.commit.findUnique).mockResolvedValue(null);

      const response = await request(app).get("/commits/sha/invalid");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Commit not found" });
    });
  });

  describe("PUT /commits/:id", () => {
    it("should update a commit", async () => {
      const updatedCommit = {
        id: "1",
        sha: "abc123",
        message: "Updated message",
      };
      vi.mocked(prisma.commit.update).mockResolvedValue(updatedCommit as any);

      const response = await request(app).put("/commits/1").send({ message: "Updated message" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedCommit);
      expect(prisma.commit.update).toHaveBeenCalledWith({
        where: { id: "1", tenantId: "test-tenant-id" },
        data: { message: "Updated message" },
      });
    });
  });

  describe("DELETE /commits/:id", () => {
    it("should delete a commit", async () => {
      vi.mocked(prisma.commit.delete).mockResolvedValue({} as any);

      const response = await request(app).delete("/commits/1");

      expect(response.status).toBe(204);
      expect(prisma.commit.delete).toHaveBeenCalledWith({
        where: { id: "1", tenantId: "test-tenant-id" },
      });
    });
  });

  describe("GET /repositories/:repositoryId/commits/stats", () => {
    it("should return commit statistics for a repository", async () => {
      const mockStats = {
        _count: 10,
        _sum: {
          additions: 1000,
          deletions: 500,
          changedFiles: 150,
        },
      };

      vi.mocked(prisma.commit.aggregate).mockResolvedValue(mockStats as any);

      const response = await request(app).get("/repositories/repo-1/commits/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalCommits: 10,
        totalAdditions: 1000,
        totalDeletions: 500,
        totalChangedFiles: 150,
      });
      expect(prisma.commit.aggregate).toHaveBeenCalledWith({
        where: { repositoryId: "repo-1", tenantId: "test-tenant-id" },
        _count: true,
        _sum: {
          additions: true,
          deletions: true,
          changedFiles: true,
        },
      });
    });

    it("should handle null sums", async () => {
      const mockStats = {
        _count: 0,
        _sum: {
          additions: null,
          deletions: null,
          changedFiles: null,
        },
      };

      vi.mocked(prisma.commit.aggregate).mockResolvedValue(mockStats as any);

      const response = await request(app).get("/repositories/repo-1/commits/stats");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        totalCommits: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        totalChangedFiles: 0,
      });
    });
  });
});
