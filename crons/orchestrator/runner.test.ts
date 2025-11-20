import type { DataSource, DataSourceConfig, PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runOrchestrator } from "./runner.js";
import type { DataSourceScript } from "./script-loader.js";

type DataSourceWithConfig = DataSource & { configs: DataSourceConfig[] };

function createMockDataSource(overrides: Partial<DataSourceWithConfig> = {}): DataSourceWithConfig {
  return {
    id: "ds-123",
    organizationId: "org-1",
    name: "Test GitHub",
    provider: "GITHUB",
    description: null,
    isEnabled: true,
    syncIntervalMinutes: 15,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    configs: [],
    ...overrides,
  };
}

vi.mock("../execution/date-calculator.js", () => ({
  calculateDateRange: vi.fn(),
}));
vi.mock("../execution/run-tracker.js", () => ({
  createRun: vi.fn(),
  completeRun: vi.fn(),
  failRun: vi.fn(),
}));
vi.mock("./advisory-locks.js", () => ({
  acquireGlobalOrchestratorLock: vi.fn(),
  releaseGlobalOrchestratorLock: vi.fn(),
  acquireAdvisoryLock: vi.fn(),
  releaseAdvisoryLock: vi.fn(),
}));
vi.mock("./script-loader.js", () => ({
  loadAllImportScripts: vi.fn(),
  getEnabledScripts: vi.fn(),
  buildEnvironment: vi.fn(),
}));

const { calculateDateRange } = await import("../execution/date-calculator.js");
const { createRun, completeRun, failRun } = await import("../execution/run-tracker.js");
const { acquireGlobalOrchestratorLock, releaseGlobalOrchestratorLock, acquireAdvisoryLock, releaseAdvisoryLock } = await import("./advisory-locks.js");
const { loadAllImportScripts, getEnabledScripts, buildEnvironment } = await import("./script-loader.js");

describe("runOrchestrator", () => {
  const mockDb = {
    dataSource: {
      update: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(loadAllImportScripts).not.toHaveBeenCalled();
    expect(releaseGlobalOrchestratorLock).not.toHaveBeenCalled();
  });

  it("should exit early if no enabled scripts are found", async () => {
    // Arrange
    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockResolvedValue([]);
    vi.mocked(getEnabledScripts).mockResolvedValue({
      scripts: [],
      dataSourceMap: new Map(),
    });

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(0);
    expect(result.scriptsFailed).toBe(0);
    expect(result.scriptsSkipped).toBe(0);
    expect(acquireGlobalOrchestratorLock).toHaveBeenCalledOnce();
    expect(loadAllImportScripts).toHaveBeenCalledOnce();
    expect(getEnabledScripts).toHaveBeenCalledOnce();
    expect(releaseGlobalOrchestratorLock).toHaveBeenCalledOnce();
  });

  it("should release global lock even if an error occurs", async () => {
    // Arrange
    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockRejectedValue(new Error("Load failed"));

    // Act
    await expect(runOrchestrator(mockDb)).rejects.toThrow("Load failed");

    // Assert
    expect(releaseGlobalOrchestratorLock).toHaveBeenCalledOnce();
  });

  it("should execute scripts with dependency resolution", async () => {
    // Arrange
    const mockRunFn = vi.fn().mockResolvedValue(undefined);
    const mockScript: DataSourceScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    const mockDataSource = createMockDataSource({
      configs: [
        {
          id: "config-1",
          dataSourceId: "ds-123",
          key: "GITHUB_TOKEN",
          value: "token123",
          isSecret: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "config-2",
          dataSourceId: "ds-123",
          key: "GITHUB_ORG",
          value: "test-org",
          isSecret: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockResolvedValue([mockScript]);
    vi.mocked(getEnabledScripts).mockResolvedValue({
      scripts: [mockScript],
      dataSourceMap: new Map([[mockScript, mockDataSource]]),
    });
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });
    vi.mocked(buildEnvironment).mockReturnValue({
      GITHUB_TOKEN: "token123",
      GITHUB_ORG: "test-org",
    });

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(1);
    expect(result.scriptsFailed).toBe(0);
    expect(result.scriptsSkipped).toBe(0);
    expect(acquireAdvisoryLock).toHaveBeenCalledWith(mockDb, "ds-123", "repository");
    expect(createRun).toHaveBeenCalledWith(mockDb, "ds-123", "repository");
    expect(calculateDateRange).toHaveBeenCalledWith(mockDb, "ds-123", "repository", 365);
    expect(buildEnvironment).toHaveBeenCalledWith(mockDataSource.configs);
    expect(mockRunFn).toHaveBeenCalledWith({
      dataSourceId: "ds-123",
      dataSourceName: "GITHUB",
      env: { GITHUB_TOKEN: "token123", GITHUB_ORG: "test-org" },
      db: mockDb,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    });
    expect(completeRun).toHaveBeenCalledWith(mockDb, "run-123", 0, new Date("2024-01-31"));
    expect(releaseAdvisoryLock).toHaveBeenCalledWith(mockDb, "ds-123", "repository");
    expect(mockDb.dataSource.update).toHaveBeenCalledWith({
      where: { id: "ds-123" },
      data: { lastSyncAt: expect.any(Date) },
    });
    expect(releaseGlobalOrchestratorLock).toHaveBeenCalledOnce();
  });

  it("should skip script execution if advisory lock cannot be acquired", async () => {
    // Arrange
    const mockRunFn = vi.fn();
    const mockScript: DataSourceScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    const mockDataSource = createMockDataSource();

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockResolvedValue([mockScript]);
    vi.mocked(getEnabledScripts).mockResolvedValue({
      scripts: [mockScript],
      dataSourceMap: new Map([[mockScript, mockDataSource]]),
    });
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(false);

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(0);
    expect(result.scriptsSkipped).toBe(1);
    expect(acquireAdvisoryLock).toHaveBeenCalledWith(mockDb, "ds-123", "repository");
    expect(mockRunFn).not.toHaveBeenCalled();
    expect(createRun).not.toHaveBeenCalled();
  });

  it("should mark run as failed and release lock if script execution fails", async () => {
    // Arrange
    const mockError = new Error("Script execution failed");
    const mockRunFn = vi.fn().mockRejectedValue(mockError);
    const mockScript: DataSourceScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    const mockDataSource = createMockDataSource();

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockResolvedValue([mockScript]);
    vi.mocked(getEnabledScripts).mockResolvedValue({
      scripts: [mockScript],
      dataSourceMap: new Map([[mockScript, mockDataSource]]),
    });
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });
    vi.mocked(buildEnvironment).mockReturnValue({});

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(0);
    expect(result.scriptsFailed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Script execution failed");
    expect(failRun).toHaveBeenCalledWith(mockDb, "run-123", "Script execution failed");
    expect(releaseAdvisoryLock).toHaveBeenCalledWith(mockDb, "ds-123", "repository");
    expect(completeRun).not.toHaveBeenCalled();
  });

  it("should update lastSyncAt for all unique data sources", async () => {
    // Arrange
    const mockScript1: DataSourceScript = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const mockScript2: DataSourceScript = {
      dataSourceName: "GITHUB",
      resource: "commit",
      dependsOn: ["repository"],
      importWindowDays: 90,
      run: vi.fn(),
    };

    const mockDataSource = createMockDataSource();

    vi.mocked(acquireGlobalOrchestratorLock).mockResolvedValue(true);
    vi.mocked(loadAllImportScripts).mockResolvedValue([mockScript1, mockScript2]);
    vi.mocked(getEnabledScripts).mockResolvedValue({
      scripts: [mockScript1, mockScript2],
      dataSourceMap: new Map([
        [mockScript1, mockDataSource],
        [mockScript2, mockDataSource],
      ]),
    });
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });
    vi.mocked(buildEnvironment).mockReturnValue({});

    // Act
    const result = await runOrchestrator(mockDb);

    // Assert
    expect(result.scriptsExecuted).toBe(2);
    expect(mockDb.dataSource.update).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSource.update).toHaveBeenCalledWith({
      where: { id: "ds-123" },
      data: { lastSyncAt: expect.any(Date) },
    });
  });
});
