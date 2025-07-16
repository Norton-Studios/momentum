import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

vi.mock("@mmtm/database", () => {
  const mockRepositories = [
    { id: 1, name: "repo1", url: "http://repo1.com", externalId: "ext1" },
    { id: 2, name: "repo2", url: "http://repo2.com", externalId: "ext2" },
  ];

  return {
    prisma: {
      repository: {
        findMany: vi.fn().mockResolvedValue(mockRepositories),
        findUnique: vi.fn().mockImplementation(({ where: { id } }) => {
          return Promise.resolve(mockRepositories.find((r) => r.id === id) || null);
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
    isAdmin: false,
  };
  next();
});

app.use(router);


describe("Repository API", () => {
  it("GET /repositories should return all repositories", async () => {
    const res = await request(app).get("/repositories");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toHaveProperty("name", "repo1");
  });

  it("GET /repository/:id should return a single repository", async () => {
    const res = await request(app).get("/repository/1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name", "repo1");
  });

  it("GET /repository/:id should return 404 for non-existent repository", async () => {
    const res = await request(app).get("/repository/99");
    expect(res.status).toBe(404);
  });
});
