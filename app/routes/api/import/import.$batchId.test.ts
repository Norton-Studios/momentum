import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    importBatch: {
      findUnique: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { loader } from "./import.$batchId";

describe("import batch loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns 400 when batchId is missing", async () => {
    const request = new Request("http://localhost/api/import/");
    const response = (await loader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Batch ID required");
  });

  it("returns 404 when batch is not found", async () => {
    vi.mocked(db.importBatch.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost/api/import/nonexistent");
    const response = (await loader({ request, params: { batchId: "nonexistent" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Batch not found");
  });

  it("returns batch with runs when found", async () => {
    const mockBatch = {
      id: "batch-1",
      status: "RUNNING",
      triggeredBy: "user-1",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: null,
      durationMs: null,
      totalScripts: 8,
      completedScripts: 4,
      failedScripts: 0,
      runs: [
        {
          id: "run-1",
          dataSourceId: "ds-1",
          dataSource: { id: "ds-1", provider: "GITHUB", name: "GitHub" },
          scriptName: "repository",
          status: "COMPLETED",
          recordsImported: 10,
          recordsFailed: 0,
          startedAt: new Date("2024-01-01T10:00:00Z"),
          completedAt: new Date("2024-01-01T10:01:00Z"),
          durationMs: 60000,
          errorMessage: null,
        },
        {
          id: "run-2",
          dataSourceId: "ds-1",
          dataSource: { id: "ds-1", provider: "GITHUB", name: "GitHub" },
          scriptName: "commit",
          status: "RUNNING",
          recordsImported: 50,
          recordsFailed: 0,
          startedAt: new Date("2024-01-01T10:01:00Z"),
          completedAt: null,
          durationMs: null,
          errorMessage: null,
        },
      ],
    };
    vi.mocked(db.importBatch.findUnique).mockResolvedValue(mockBatch as never);

    const request = new Request("http://localhost/api/import/batch-1");
    const response = (await loader({ request, params: { batchId: "batch-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("batch-1");
    expect(body.status).toBe("RUNNING");
    expect(body.runs).toHaveLength(2);
    expect(body.runs[0].scriptName).toBe("repository");
    expect(body.runs[0].status).toBe("COMPLETED");
    expect(body.runs[1].scriptName).toBe("commit");
    expect(body.runs[1].status).toBe("RUNNING");
  });

  it("formats dates correctly", async () => {
    const mockBatch = {
      id: "batch-1",
      status: "COMPLETED",
      triggeredBy: "user-1",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:05:00Z"),
      durationMs: 300000,
      totalScripts: 8,
      completedScripts: 8,
      failedScripts: 0,
      runs: [],
    };
    vi.mocked(db.importBatch.findUnique).mockResolvedValue(mockBatch as never);

    const request = new Request("http://localhost/api/import/batch-1");
    const response = (await loader({ request, params: { batchId: "batch-1" }, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    expect(body.startedAt).toBe("2024-01-01T10:00:00.000Z");
    expect(body.completedAt).toBe("2024-01-01T10:05:00.000Z");
  });
});
