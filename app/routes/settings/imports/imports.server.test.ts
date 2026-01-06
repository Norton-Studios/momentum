import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { "Content-Type": "application/json" },
      }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    id: "user_1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
  }),
}));

vi.mock("~/lib/import/trigger-import", () => ({
  triggerImport: vi.fn(),
}));

vi.mock("@crons/execution/run-tracker.js", () => ({
  cleanupStaleRuns: vi.fn().mockResolvedValue(0),
}));

vi.mock("~/db.server", () => ({
  db: {
    importBatch: {
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

import { db } from "~/db.server";
import { importsAction, importsLoader } from "./imports.server";

function createArgs(request: Request) {
  return { request, params: {}, context: {}, unstable_pattern: "" } as never;
}

describe("importsLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns import batches with runs", async () => {
    vi.mocked(db.importBatch.findMany).mockResolvedValue([
      {
        id: "batch-1",
        status: "COMPLETED",
        triggeredBy: "Admin User",
        startedAt: new Date("2025-12-23T10:00:00Z"),
        completedAt: new Date("2025-12-23T10:05:00Z"),
        durationMs: 300000,
        totalScripts: 5,
        completedScripts: 5,
        failedScripts: 0,
        runs: [
          {
            id: "run-1",
            scriptName: "repository",
            status: "COMPLETED",
            recordsImported: 100,
            recordsFailed: 0,
            durationMs: 60000,
            errorMessage: null,
            startedAt: new Date("2025-12-23T10:00:00Z"),
            completedAt: new Date("2025-12-23T10:01:00Z"),
            dataSource: {
              name: "Test GitHub",
              provider: "GITHUB",
            },
          },
        ],
      },
    ] as never);

    const request = new Request("http://localhost/settings/imports");
    const result = (await importsLoader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].id).toBe("batch-1");
    expect(data.batches[0].status).toBe("COMPLETED");
    expect(data.batches[0].triggeredBy).toBe("Admin User");
    expect(data.batches[0].totalScripts).toBe(5);
    // completedScripts is calculated from actual runs (not batch field) for real-time progress
    expect(data.batches[0].completedScripts).toBe(1);
    expect(data.batches[0].runs).toHaveLength(1);
    expect(data.batches[0].runs[0].scriptName).toBe("repository");
    expect(data.batches[0].runs[0].recordsImported).toBe(100);
    expect(data.isRunning).toBe(false);
  });

  it("detects running imports correctly", async () => {
    vi.mocked(db.importBatch.findMany).mockResolvedValue([
      {
        id: "batch-1",
        status: "RUNNING",
        triggeredBy: "System",
        startedAt: new Date(),
        completedAt: null,
        durationMs: null,
        totalScripts: 10,
        completedScripts: 5,
        failedScripts: 0,
        runs: [],
      },
    ] as never);

    const request = new Request("http://localhost/settings/imports");
    const result = (await importsLoader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.isRunning).toBe(true);
  });

  it("returns empty array when no batches exist", async () => {
    vi.mocked(db.importBatch.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/settings/imports");
    const result = (await importsLoader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.batches).toHaveLength(0);
    expect(data.isRunning).toBe(false);
  });

  it("limits results to 50 batches", async () => {
    const batches = Array.from({ length: 50 }, (_, i) => ({
      id: `batch-${i}`,
      status: "COMPLETED",
      triggeredBy: null,
      startedAt: new Date(Date.now() - i * 1000),
      completedAt: new Date(Date.now() - i * 1000 + 60000),
      durationMs: 60000,
      totalScripts: 1,
      completedScripts: 1,
      failedScripts: 0,
      runs: [],
    }));

    vi.mocked(db.importBatch.findMany).mockResolvedValue(batches as never);

    const request = new Request("http://localhost/settings/imports");
    const result = (await importsLoader(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.batches).toHaveLength(50);
    expect(db.importBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });
});

describe("importsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers import successfully", async () => {
    const { triggerImport } = await import("~/lib/import/trigger-import");
    vi.mocked(triggerImport).mockResolvedValue({
      status: "started",
      batchId: "batch_123",
    });

    const formData = new FormData();
    formData.append("intent", "trigger-import");

    const request = new Request("http://localhost/settings/imports", {
      method: "POST",
      body: formData,
    });

    const result = (await importsAction(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(triggerImport).toHaveBeenCalledWith("Admin User");
    expect(data.success).toBe(true);
    expect(data.batchId).toBe("batch_123");
  });

  it("returns error when no data sources are enabled", async () => {
    const { triggerImport } = await import("~/lib/import/trigger-import");
    vi.mocked(triggerImport).mockResolvedValue({
      status: "no_data_sources",
    });

    const formData = new FormData();
    formData.append("intent", "trigger-import");

    const request = new Request("http://localhost/settings/imports", {
      method: "POST",
      body: formData,
    });

    const result = (await importsAction(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data.error).toBe("No enabled data sources found. Please configure data sources first.");
  });

  it("handles already running import", async () => {
    const { triggerImport } = await import("~/lib/import/trigger-import");
    vi.mocked(triggerImport).mockResolvedValue({
      status: "already_running",
      batchId: "existing_batch_123",
    });

    const formData = new FormData();
    formData.append("intent", "trigger-import");

    const request = new Request("http://localhost/settings/imports", {
      method: "POST",
      body: formData,
    });

    const result = (await importsAction(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(data.alreadyRunning).toBe(true);
    expect(data.batchId).toBe("existing_batch_123");
  });

  it("returns error for invalid intent", async () => {
    const formData = new FormData();
    formData.append("intent", "invalid-intent");

    const request = new Request("http://localhost/settings/imports", {
      method: "POST",
      body: formData,
    });

    const result = (await importsAction(createArgs(request))) as unknown as Response;
    const data = await result.json();

    expect(result.status).toBe(400);
    expect(data.error).toBe("Invalid action");
  });
});
