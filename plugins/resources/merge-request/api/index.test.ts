import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "./index";

// Mock the database
vi.mock("@mmtm/database", () => {
  const mockPrisma = {
    mergeRequest: {
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

describe("Merge Request API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a merge request", async () => {
    const mockMergeRequest = {
      id: 1,
      tenantId: "test-tenant-id",
      repositoryId: 1,
      externalId: "123",
      number: 1,
      title: "Test MR",
      state: "open",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.create).mockResolvedValue(mockMergeRequest);

    const response = await request(app).post("/merge-request").send({
      repositoryId: 1,
      externalId: "123",
      number: 1,
      title: "Test MR",
      state: "open",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockMergeRequest);
  });

  it("should get all merge requests", async () => {
    const mockMergeRequests = [
      {
        id: 1,
        tenantId: "test-tenant-id",
        title: "Test MR 1",
        state: "open",
      },
      {
        id: 2,
        tenantId: "test-tenant-id",
        title: "Test MR 2",
        state: "merged",
      },
    ];

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.findMany).mockResolvedValue(mockMergeRequests);

    const response = await request(app).get("/merge-requests");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockMergeRequests);
  });

  it("should get a specific merge request", async () => {
    const mockMergeRequest = {
      id: 1,
      tenantId: "test-tenant-id",
      title: "Test MR",
      state: "open",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.findUnique).mockResolvedValue(mockMergeRequest);

    const response = await request(app).get("/merge-request/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockMergeRequest);
  });

  it("should return 404 for non-existent merge request", async () => {
    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.findUnique).mockResolvedValue(null);

    const response = await request(app).get("/merge-request/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Merge request not found");
  });

  it("should update a merge request", async () => {
    const mockUpdatedMergeRequest = {
      id: 1,
      tenantId: "test-tenant-id",
      title: "Updated MR",
      state: "merged",
    };

    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.update).mockResolvedValue(mockUpdatedMergeRequest);

    const response = await request(app).put("/merge-request/1").send({
      title: "Updated MR",
      state: "merged",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUpdatedMergeRequest);
  });

  it("should delete a merge request", async () => {
    const { prisma } = await import("@mmtm/database");
    vi.mocked(prisma.mergeRequest.delete).mockResolvedValue({});

    const response = await request(app).delete("/merge-request/1");

    expect(response.status).toBe(204);
  });
});
