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
    dataSourceRun: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { loader as listRunsLoader } from "./data-source.$dataSourceId.run";
import { loader as getRunLoader } from "./data-source.$dataSourceId.run.$runId";

describe("list runs loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns 400 when dataSourceId is missing", async () => {
    const request = new Request("http://localhost/api/data-source//run");
    const response = (await listRunsLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Data source ID required");
  });

  it("returns list of runs for data source", async () => {
    const mockRuns = [
      {
        id: "run-1",
        dataSourceId: "ds-1",
        importBatchId: "batch-1",
        importBatch: { id: "batch-1", status: "COMPLETED", triggeredBy: "user-1" },
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
        importBatchId: "batch-1",
        importBatch: { id: "batch-1", status: "COMPLETED", triggeredBy: "user-1" },
        scriptName: "commit",
        status: "COMPLETED",
        recordsImported: 100,
        recordsFailed: 0,
        startedAt: new Date("2024-01-01T10:01:00Z"),
        completedAt: new Date("2024-01-01T10:05:00Z"),
        durationMs: 240000,
        errorMessage: null,
      },
    ];
    vi.mocked(db.dataSourceRun.findMany).mockResolvedValue(mockRuns as never);

    const request = new Request("http://localhost/api/data-source/ds-1/run");
    const response = (await listRunsLoader({ request, params: { dataSourceId: "ds-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runs).toHaveLength(2);
    expect(body.runs[0].scriptName).toBe("repository");
    expect(body.runs[1].scriptName).toBe("commit");
  });

  it("filters by batchId when provided", async () => {
    vi.mocked(db.dataSourceRun.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/api/data-source/ds-1/run?batchId=batch-2");
    await listRunsLoader({ request, params: { dataSourceId: "ds-1" }, context: {} } as never);

    expect(db.dataSourceRun.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dataSourceId: "ds-1",
          importBatchId: "batch-2",
        },
      })
    );
  });

  it("returns empty array when no runs exist", async () => {
    vi.mocked(db.dataSourceRun.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/api/data-source/ds-1/run");
    const response = (await listRunsLoader({ request, params: { dataSourceId: "ds-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runs).toEqual([]);
  });
});

describe("get run loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("returns 400 when dataSourceId or runId is missing", async () => {
    const request = new Request("http://localhost/api/data-source/ds-1/run/");
    const response = (await getRunLoader({ request, params: { dataSourceId: "ds-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Data source ID and run ID required");
  });

  it("returns 404 when run is not found", async () => {
    vi.mocked(db.dataSourceRun.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/api/data-source/ds-1/run/nonexistent");
    const response = (await getRunLoader({ request, params: { dataSourceId: "ds-1", runId: "nonexistent" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Run not found");
  });

  it("returns run with logs when found", async () => {
    const mockRun = {
      id: "run-1",
      dataSourceId: "ds-1",
      dataSource: { id: "ds-1", provider: "GITHUB", name: "GitHub" },
      importBatchId: "batch-1",
      importBatch: {
        id: "batch-1",
        status: "COMPLETED",
        triggeredBy: "user-1",
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T10:05:00Z"),
      },
      scriptName: "repository",
      status: "COMPLETED",
      recordsImported: 10,
      recordsFailed: 0,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:01:00Z"),
      durationMs: 60000,
      errorMessage: null,
      lastFetchedDataAt: new Date("2024-01-01T10:00:30Z"),
      logs: [
        {
          id: "log-1",
          level: "INFO",
          message: "Started importing repositories",
          details: null,
          recordId: null,
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "log-2",
          level: "INFO",
          message: "Imported 10 repositories",
          details: null,
          recordId: null,
          createdAt: new Date("2024-01-01T10:01:00Z"),
        },
      ],
    };
    vi.mocked(db.dataSourceRun.findFirst).mockResolvedValue(mockRun as never);

    const request = new Request("http://localhost/api/data-source/ds-1/run/run-1");
    const response = (await getRunLoader({ request, params: { dataSourceId: "ds-1", runId: "run-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("run-1");
    expect(body.scriptName).toBe("repository");
    expect(body.dataSource.provider).toBe("GITHUB");
    expect(body.logs).toHaveLength(2);
    expect(body.logs[0].message).toBe("Started importing repositories");
  });

  it("handles null importBatch", async () => {
    const mockRun = {
      id: "run-1",
      dataSourceId: "ds-1",
      dataSource: { id: "ds-1", provider: "GITHUB", name: "GitHub" },
      importBatchId: null,
      importBatch: null,
      scriptName: "repository",
      status: "COMPLETED",
      recordsImported: 10,
      recordsFailed: 0,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:01:00Z"),
      durationMs: 60000,
      errorMessage: null,
      lastFetchedDataAt: null,
      logs: [],
    };
    vi.mocked(db.dataSourceRun.findFirst).mockResolvedValue(mockRun as never);

    const request = new Request("http://localhost/api/data-source/ds-1/run/run-1");
    const response = (await getRunLoader({ request, params: { dataSourceId: "ds-1", runId: "run-1" }, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.importBatch).toBeNull();
    expect(body.lastFetchedDataAt).toBeNull();
  });
});
