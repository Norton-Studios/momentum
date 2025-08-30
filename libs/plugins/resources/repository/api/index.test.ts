import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

vi.mock("@mmtm/database", () => {
  const mockRepositories = [
    { id: 1, name: "repo1", url: "http://repo1.com", externalId: "ext1", tenantId: "test-tenant-id" },
    { id: 2, name: "repo2", url: "http://repo2.com", externalId: "ext2", tenantId: "test-tenant-id" },
  ];

  return {
    prisma: {
      repository: {
        findMany: vi.fn().mockResolvedValue(mockRepositories),
        findUnique: vi.fn().mockImplementation(({ where: { id } }) => {
          return Promise.resolve(mockRepositories.find((r) => r.id === id) || null);
        }),
        create: vi.fn().mockImplementation(({ data }) => {
          const newRepo = {
            id: 3,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return Promise.resolve(newRepo);
        }),
        update: vi.fn().mockImplementation(({ where, data }) => {
          const existingRepo = mockRepositories.find((r) => r.id === where.id);
          if (!existingRepo) {
            throw new Error("Repository not found");
          }
          const updatedRepo = { ...existingRepo, ...data, updatedAt: new Date() };
          return Promise.resolve(updatedRepo);
        }),
        delete: vi.fn().mockImplementation(({ where }) => {
          const existingRepo = mockRepositories.find((r) => r.id === where.id);
          if (!existingRepo) {
            throw new Error("Repository not found");
          }
          return Promise.resolve(existingRepo);
        }),
      },
    },
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

describe("Repository API", () => {
  describe("GET /repositories", () => {
    it("should return all repositories", async () => {
      const res = await request(app).get("/repositories");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty("name", "repo1");
    });

    it("should handle server errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.findMany).mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).get("/repositories");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to fetch repositories" });
    });
  });

  describe("GET /repository/:id", () => {
    it("should return a single repository", async () => {
      const res = await request(app).get("/repository/1");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "repo1");
    });

    it("should return 404 for non-existent repository", async () => {
      const res = await request(app).get("/repository/99");
      expect(res.status).toBe(404);
    });

    it("should handle server errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.findUnique).mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).get("/repository/1");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to fetch repository" });
    });
  });

  describe("POST /repository", () => {
    it("should create a new repository", async () => {
      const newRepo = {
        name: "new-repo",
        url: "http://new-repo.com",
        externalId: "ext3",
      };

      const res = await request(app).post("/repository").send(newRepo);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id", 3);
      expect(res.body).toHaveProperty("name", "new-repo");
      expect(res.body).toHaveProperty("url", "http://new-repo.com");
      expect(res.body).toHaveProperty("externalId", "ext3");
      expect(res.body).toHaveProperty("tenantId", "test-tenant-id");
    });

    it("should handle server errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.create).mockRejectedValueOnce(new Error("Database error"));

      const newRepo = {
        name: "new-repo",
        url: "http://new-repo.com",
        externalId: "ext3",
      };

      const res = await request(app).post("/repository").send(newRepo);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to create repository" });
    });
  });

  describe("PUT /repository/:id", () => {
    it("should update an existing repository", async () => {
      const updateData = {
        name: "updated-repo",
        url: "http://updated-repo.com",
        externalId: "ext1-updated",
      };

      const res = await request(app).put("/repository/1").send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "updated-repo");
      expect(res.body).toHaveProperty("url", "http://updated-repo.com");
      expect(res.body).toHaveProperty("externalId", "ext1-updated");
    });

    it("should handle server errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.update).mockRejectedValueOnce(new Error("Database error"));

      const updateData = {
        name: "updated-repo",
        url: "http://updated-repo.com",
        externalId: "ext1-updated",
      };

      const res = await request(app).put("/repository/1").send(updateData);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to update repository" });
    });

    it("should handle non-existent repository", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.update).mockRejectedValueOnce(new Error("Repository not found"));

      const updateData = {
        name: "updated-repo",
        url: "http://updated-repo.com",
        externalId: "ext1-updated",
      };

      const res = await request(app).put("/repository/99").send(updateData);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to update repository" });
    });
  });

  describe("DELETE /repository/:id", () => {
    it("should delete an existing repository", async () => {
      const res = await request(app).delete("/repository/1");
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should handle server errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.delete).mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).delete("/repository/1");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to delete repository" });
    });

    it("should handle non-existent repository", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.repository.delete).mockRejectedValueOnce(new Error("Repository not found"));

      const res = await request(app).delete("/repository/99");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Failed to delete repository" });
    });
  });
});
