import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

// Mock the database
vi.mock("@developer-productivity/database", () => {
  const mockPrisma = {
    pipeline: {
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

describe("Pipeline API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a pipeline", async () => {
    const mockPipeline = {
      id: 1,
      tenantId: "test-tenant-id",
      repositoryId: 1,
      externalId: "123",
      name: "Test Pipeline",
      status: "pending",
    };

    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.create).mockResolvedValue(mockPipeline);

    const response = await request(app).post("/pipeline").send({
      repositoryId: 1,
      externalId: "123",
      name: "Test Pipeline",
      status: "pending",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockPipeline);
  });

  it("should get all pipelines", async () => {
    const mockPipelines = [
      {
        id: 1,
        tenantId: "test-tenant-id",
        name: "Test Pipeline 1",
        status: "success",
      },
      {
        id: 2,
        tenantId: "test-tenant-id",
        name: "Test Pipeline 2",
        status: "failed",
      },
    ];

    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.findMany).mockResolvedValue(mockPipelines);

    const response = await request(app).get("/pipelines");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPipelines);
  });

  it("should get a specific pipeline", async () => {
    const mockPipeline = {
      id: 1,
      tenantId: "test-tenant-id",
      name: "Test Pipeline",
      status: "success",
    };

    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(mockPipeline);

    const response = await request(app).get("/pipeline/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockPipeline);
  });

  it("should return 404 for non-existent pipeline", async () => {
    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.findUnique).mockResolvedValue(null);

    const response = await request(app).get("/pipeline/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Pipeline not found");
  });

  it("should update a pipeline", async () => {
    const mockUpdatedPipeline = {
      id: 1,
      tenantId: "test-tenant-id",
      name: "Updated Pipeline",
      status: "success",
    };

    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.update).mockResolvedValue(mockUpdatedPipeline);

    const response = await request(app).put("/pipeline/1").send({
      name: "Updated Pipeline",
      status: "success",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUpdatedPipeline);
  });

  it("should delete a pipeline", async () => {
    const { prisma } = await import("@developer-productivity/database");
    vi.mocked(prisma.pipeline.delete).mockResolvedValue({});

    const response = await request(app).delete("/pipeline/1");

    expect(response.status).toBe(204);
  });
});
