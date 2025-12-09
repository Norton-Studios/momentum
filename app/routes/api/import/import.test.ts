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
    dataSource: {
      count: vi.fn(),
    },
    importBatch: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({ $queryRaw: vi.fn() })),
  },
}));

vi.mock("@crons/orchestrator/runner.js", () => ({
  runOrchestrator: vi.fn().mockResolvedValue({
    batchId: "batch-1",
    scriptsExecuted: 4,
    scriptsFailed: 0,
    scriptsSkipped: 0,
    executionTimeMs: 1234,
    errors: [],
  }),
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { action, loader } from "./import";

describe("import action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns 405 for non-POST requests", async () => {
    const request = new Request("http://localhost/api/import", { method: "GET" });
    const response = (await action({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.error).toBe("Method not allowed");
  });

  it("returns 400 when no data sources are enabled", async () => {
    vi.mocked(db.dataSource.count).mockResolvedValue(0);

    const request = new Request("http://localhost/api/import", { method: "POST" });
    const response = (await action({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No enabled data sources found");
  });

  it("returns already_running when import is in progress", async () => {
    vi.mocked(db.dataSource.count).mockResolvedValue(2);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue({
      id: "existing-batch",
      status: "RUNNING",
    } as never);

    const request = new Request("http://localhost/api/import", { method: "POST" });
    const response = (await action({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("already_running");
    expect(body.batchId).toBe("existing-batch");
  });

  it("starts import when no batch is running", async () => {
    vi.mocked(db.dataSource.count).mockResolvedValue(2);
    vi.mocked(db.importBatch.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "new-batch",
        status: "RUNNING",
      } as never);

    const request = new Request("http://localhost/api/import", { method: "POST" });
    const response = (await action({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("started");
    expect(body.batchId).toBe("new-batch");
  });
});

describe("import loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns list of recent batches", async () => {
    const mockBatches = [
      {
        id: "batch-1",
        status: "COMPLETED",
        triggeredBy: "user-1",
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T10:05:00Z"),
        durationMs: 300000,
        totalScripts: 8,
        completedScripts: 8,
        failedScripts: 0,
        _count: { runs: 8 },
      },
      {
        id: "batch-2",
        status: "RUNNING",
        triggeredBy: "scheduler",
        startedAt: new Date("2024-01-02T10:00:00Z"),
        completedAt: null,
        durationMs: null,
        totalScripts: 8,
        completedScripts: 4,
        failedScripts: 0,
        _count: { runs: 4 },
      },
    ];
    vi.mocked(db.importBatch.findMany).mockResolvedValue(mockBatches as never);

    const request = new Request("http://localhost/api/import");
    const response = (await loader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.batches).toHaveLength(2);
    expect(body.batches[0].id).toBe("batch-1");
    expect(body.batches[0].status).toBe("COMPLETED");
    expect(body.batches[0].runCount).toBe(8);
    expect(body.batches[1].completedAt).toBeNull();
  });

  it("returns empty array when no batches exist", async () => {
    vi.mocked(db.importBatch.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/api/import");
    const response = (await loader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.batches).toEqual([]);
  });
});
