import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

// Mock the database
vi.mock("@mmtm/database", () => {
  const mockPrisma = {
    build: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
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

describe("Build API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a build", async () => {
    const mockBuild = {
      id: 1,
      tenantId: "test-tenant-id",
      pipelineId: 1,
      externalId: "123",
      name: "Test Build",
      status: "pending",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.create).mockResolvedValue(mockBuild);

    const response = await request(app).post("/build").send({
      pipelineId: 1,
      externalId: "123",
      name: "Test Build",
      status: "pending",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockBuild);
  });

  it("should get all builds", async () => {
    const mockBuilds = [
      {
        id: 1,
        tenantId: "test-tenant-id",
        name: "Test Build 1",
        status: "success",
      },
      {
        id: 2,
        tenantId: "test-tenant-id",
        name: "Test Build 2",
        status: "failed",
      },
    ];

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.findMany).mockResolvedValue(mockBuilds);

    const response = await request(app).get("/builds");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockBuilds);
  });

  it("should get a specific build", async () => {
    const mockBuild = {
      id: 1,
      tenantId: "test-tenant-id",
      name: "Test Build",
      status: "success",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.findUnique).mockResolvedValue(mockBuild);

    const response = await request(app).get("/build/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockBuild);
  });

  it("should return 404 for non-existent build", async () => {
    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.findUnique).mockResolvedValue(null);

    const response = await request(app).get("/build/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Build not found");
  });

  it("should update a build", async () => {
    const mockUpdatedBuild = {
      id: 1,
      tenantId: "test-tenant-id",
      name: "Updated Build",
      status: "success",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.update).mockResolvedValue(mockUpdatedBuild);

    const response = await request(app).put("/build/1").send({
      name: "Updated Build",
      status: "success",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUpdatedBuild);
  });

  it("should delete a build", async () => {
    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.build.delete).mockResolvedValue({});

    const response = await request(app).delete("/build/1");

    expect(response.status).toBe(204);
  });
});
