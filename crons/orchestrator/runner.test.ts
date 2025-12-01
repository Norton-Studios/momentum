import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runOrchestrator } from "./runner.js";

vi.mock("../execution/advisory-locks.js", () => ({
  acquireGlobalOrchestratorLock: vi.fn(),
  releaseGlobalOrchestratorLock: vi.fn(),
}));

vi.mock("./script-loader.js", () => ({
  getEnabledScripts: vi.fn(),
}));

vi.mock("../execution/execution-graph.js", () => ({
  buildExecutionGraph: vi.fn(),
}));

const { acquireGlobalOrchestratorLock, releaseGlobalOrchestratorLock } = await import("../execution/advisory-locks.js");
const { getEnabledScripts } = await import("./script-loader.js");
const { buildExecutionGraph } = await import("../execution/execution-graph.js");

describe("runOrchestrator", () => {
  let mockDb: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      dataSource: {
        update: vi.fn(),
      },
      importBatch: {
        create: vi.fn().mockResolvedValue({ id: "batch-1" }),
        update: vi.fn(),
      },
    } as unknown as PrismaClient;
  });

  it("should exit early if global lock cannot be acquired", async () => {
    // Arrange
    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(false);

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(0);
    expect(result.scriptsFailed).toBe(0);
    expect(result.scriptsSkipped).toBe(0);
    expect(acquireGlobalOrchestratorLock).toHaveBeenCalledOnce();
    expect(getEnabledScripts).not.toHaveBeenCalled();
    expect(releaseGlobalOrchestratorLock).not.toHaveBeenCalled();
  });

  it("should exit early if no enabled scripts are found", async () => {
    // Arrange
    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(new Map());

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(0);
    expect(result.scriptsFailed).toBe(0);
    expect(result.scriptsSkipped).toBe(0);
    expect(acquireGlobalOrchestratorLock).toHaveBeenCalledOnce();
    expect(getEnabledScripts).toHaveBeenCalledOnce();
    expect(releaseGlobalOrchestratorLock).not.toHaveBeenCalled();
  });

  it("should execute scripts via execution graph", async () => {
    // Arrange
    const mockScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const mockExecutionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
    };

    const scriptsMap = new Map([[mockScript, mockExecutionContext]]) as never;

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(scriptsMap);
    vi.mocked(buildExecutionGraph).mockReturnValue({
      run: vi.fn().mockResolvedValue(undefined),
    } as never);

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(buildExecutionGraph).toHaveBeenCalledWith(mockDb, scriptsMap, expect.any(Map), expect.any(Array), "batch-1");
    expect(mockDb.dataSource.update).toHaveBeenCalledWith({
      where: { id: "ds-123" },
      data: { lastSyncAt: expect.any(Date) },
    });
    expect(releaseGlobalOrchestratorLock).toHaveBeenCalledOnce();
    expect(result.batchId).toBe("batch-1");
  });

  it("should release global lock even if an error occurs", async () => {
    // Arrange
    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(new Map([[{} as never, { id: "ds-1" } as never]]));
    vi.mocked(buildExecutionGraph).mockReturnValue({
      run: vi.fn().mockRejectedValue(new Error("Graph execution failed")),
    } as never);

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(releaseGlobalOrchestratorLock).toHaveBeenCalledOnce();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Graph execution failed");
  });

  it("should update lastSyncAt for all data sources", async () => {
    // Arrange
    const mockScript1 = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const mockScript2 = {
      dataSourceName: "GITHUB",
      resource: "commit",
      dependsOn: ["repository"],
      importWindowDays: 90,
      run: vi.fn(),
    };

    const mockExecutionContext1 = {
      id: "ds-1",
      provider: "GITHUB",
      env: {},
    };

    const mockExecutionContext2 = {
      id: "ds-2",
      provider: "GITHUB",
      env: {},
    };

    const scriptsMap = new Map([
      [mockScript1, mockExecutionContext1],
      [mockScript2, mockExecutionContext2],
    ]) as never;

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(scriptsMap);
    vi.mocked(buildExecutionGraph).mockReturnValue({
      run: vi.fn().mockResolvedValue(undefined),
    } as never);

    // Act
    await runOrchestrator(mockDb);

    // Assert
    expect(mockDb.dataSource.update).toHaveBeenCalledTimes(2);
  });

  it("should finalize batch with correct counts", async () => {
    // Arrange
    const mockScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const scriptsMap = new Map([[mockScript, { id: "ds-1" } as never]]);

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(scriptsMap);

    // Simulate execution results by modifying the map passed to buildExecutionGraph
    vi.mocked(buildExecutionGraph).mockImplementation((_db, _scripts, executionResults, _errors, _batchId) => {
      executionResults.set("ds-1:repository", { success: true, skipped: false });
      return {
        run: vi.fn().mockResolvedValue(undefined),
      } as never;
    });

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(mockDb.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: {
        status: "COMPLETED",
        completedAt: expect.any(Date),
        durationMs: expect.any(Number),
        completedScripts: 1,
        failedScripts: 0,
      },
    });
    expect(result.scriptsExecuted).toBe(1);
    expect(result.scriptsFailed).toBe(0);
  });

  it("should mark batch as failed when scripts fail", async () => {
    // Arrange
    const mockScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const scriptsMap = new Map([[mockScript, { id: "ds-1" } as never]]);

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(getEnabledScripts).mockResolvedValue(scriptsMap);

    vi.mocked(buildExecutionGraph).mockImplementation((_db, _scripts, executionResults, errors, _batchId) => {
      executionResults.set("ds-1:repository", { success: false, skipped: false, error: "Script failed" });
      errors.push({ script: "GITHUB:repository", error: "Script failed" });
      return {
        run: vi.fn().mockResolvedValue(undefined),
      } as never;
    });

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(mockDb.importBatch.update).toHaveBeenCalledWith({
      where: { id: "batch-1" },
      data: {
        status: "FAILED",
        completedAt: expect.any(Date),
        durationMs: expect.any(Number),
        completedScripts: 0,
        failedScripts: 1,
      },
    });
    expect(result.scriptsFailed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
