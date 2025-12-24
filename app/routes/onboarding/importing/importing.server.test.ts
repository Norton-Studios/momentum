import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    dataSource: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    repository: {
      count: vi.fn(),
    },
    importBatch: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({ $queryRaw: vi.fn() })),
  },
}));

const mockRunOrchestrator = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    batchId: "batch-1",
    scriptsExecuted: 4,
    scriptsFailed: 0,
    scriptsSkipped: 0,
    executionTimeMs: 1234,
    errors: [],
  })
);

vi.mock("@crons/orchestrator/runner.js", () => ({
  runOrchestrator: mockRunOrchestrator,
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { importingAction, importingLoader } from "./importing.server";

describe("importingLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("redirects to datasources when no enabled data sources exist", async () => {
    vi.mocked(db.dataSource.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/onboarding/datasources");
  });

  it("returns hasStartedImport false when no batch is running", async () => {
    const mockDataSources = [{ id: "ds-1", provider: "GITHUB", name: "GitHub", isEnabled: true }];
    vi.mocked(db.dataSource.findMany).mockResolvedValue(mockDataSources as never);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue(null);
    vi.mocked(db.repository.count).mockResolvedValue(25);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dataSources).toHaveLength(1);
    expect(body.repositoryCount).toBe(25);
    expect(body.hasStartedImport).toBe(false);
    expect(body.isImportRunning).toBe(false);
    expect(body.currentBatch).toBe(null);
  });

  it("returns running batch info when import is in progress", async () => {
    const mockDataSources = [{ id: "ds-1", provider: "GITHUB", name: "GitHub", isEnabled: true }];
    const mockBatch = {
      id: "batch-1",
      status: "RUNNING",
      triggeredBy: "user-1",
      startedAt: new Date(),
      completedAt: null,
      durationMs: null,
      totalScripts: 4,
      completedScripts: 2,
      failedScripts: 0,
      runs: [],
    };
    vi.mocked(db.dataSource.findMany).mockResolvedValue(mockDataSources as never);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue(mockBatch as never);
    vi.mocked(db.repository.count).mockResolvedValue(25);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    expect(body.isImportRunning).toBe(true);
    expect(body.hasStartedImport).toBe(true);
    expect(body.currentBatch.id).toBe("batch-1");
  });

  it("queries only enabled data sources", async () => {
    vi.mocked(db.dataSource.findMany).mockResolvedValue([]);

    const request = new Request("http://localhost/onboarding/importing");
    await importingLoader({ request, params: {}, context: {} } as never);

    expect(db.dataSource.findMany).toHaveBeenCalledWith({
      where: { isEnabled: true },
    });
  });

  it("returns GitHub-specific tasks for GitHub data source", async () => {
    const mockDataSources = [{ id: "ds-1", provider: "GITHUB", name: "GitHub", isEnabled: true }];
    vi.mocked(db.dataSource.findMany).mockResolvedValue(mockDataSources as never);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue(null);
    vi.mocked(db.repository.count).mockResolvedValue(10);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    const githubTasks = body.dataSources[0].tasks.map((t: { resource: string }) => t.resource);
    expect(githubTasks).toEqual(["repository", "contributor", "commit", "pull-request", "project", "issue", "pipeline", "pipeline-run"]);
  });

  it("returns Jira-specific tasks for Jira data source", async () => {
    const mockDataSources = [{ id: "ds-2", provider: "JIRA", name: "Jira", isEnabled: true }];
    vi.mocked(db.dataSource.findMany).mockResolvedValue(mockDataSources as never);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue(null);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    const jiraTasks = body.dataSources[0].tasks.map((t: { resource: string }) => t.resource);
    expect(jiraTasks).toEqual(["project", "board", "sprint", "issue", "status-transition"]);
  });

  it("returns GitLab-specific tasks for GitLab data source", async () => {
    const mockDataSources = [{ id: "ds-3", provider: "GITLAB", name: "GitLab", isEnabled: true }];
    vi.mocked(db.dataSource.findMany).mockResolvedValue(mockDataSources as never);
    vi.mocked(db.importBatch.findFirst).mockResolvedValue(null);
    vi.mocked(db.repository.count).mockResolvedValue(5);

    const request = new Request("http://localhost/onboarding/importing");
    const response = (await importingLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    const gitlabTasks = body.dataSources[0].tasks.map((t: { resource: string }) => t.resource);
    expect(gitlabTasks).toEqual(["repository", "contributor", "commit", "merge-request", "project", "issue", "pipeline", "pipeline-run"]);
  });
});

describe("importingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  describe("continue intent", () => {
    it("redirects to complete page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = (await importingAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/onboarding/complete");
    });
  });

  describe("start-import intent", () => {
    it("returns existing batch if one is already running", async () => {
      vi.mocked(db.dataSource.count).mockResolvedValue(1);
      vi.mocked(db.importBatch.findFirst).mockResolvedValue({
        id: "existing-batch",
        status: "RUNNING",
      } as never);

      const formData = new FormData();
      formData.append("intent", "start-import");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = (await importingAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.batchId).toBe("existing-batch");
      expect(mockRunOrchestrator).not.toHaveBeenCalled();
    });

    it("starts orchestrator in fire-and-forget manner when no batch running", async () => {
      vi.mocked(db.dataSource.count).mockResolvedValue(1);
      // First call (check for existing) returns null, second call (after start) returns new batch
      vi.mocked(db.importBatch.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "new-batch", status: "RUNNING" } as never);

      const formData = new FormData();
      formData.append("intent", "start-import");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = (await importingAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.batchId).toBe("new-batch");
      // runOrchestrator is called inside a transaction, so it receives a tx client
      expect(mockRunOrchestrator).toHaveBeenCalledWith(expect.anything(), { triggeredBy: "user-1" });
    });
  });

  describe("invalid intent", () => {
    it("returns error for unknown intent", async () => {
      const formData = new FormData();
      formData.append("intent", "unknown");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = (await importingAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid intent");
    });

    it("returns error when no intent provided", async () => {
      const formData = new FormData();

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = (await importingAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
    });
  });
});
