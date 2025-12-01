import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeScript } from "./execute-script.js";

vi.mock("./advisory-locks.js", () => ({
  acquireAdvisoryLock: vi.fn(),
  releaseAdvisoryLock: vi.fn(),
}));

vi.mock("./date-calculator.js", () => ({
  calculateDateRange: vi.fn(),
}));

vi.mock("./run-tracker.js", () => ({
  createRun: vi.fn(),
  completeRun: vi.fn(),
  failRun: vi.fn(),
}));

const { acquireAdvisoryLock, releaseAdvisoryLock } = await import("./advisory-locks.js");
const { calculateDateRange } = await import("./date-calculator.js");
const { createRun, completeRun, failRun } = await import("./run-tracker.js");

describe("executeScript", () => {
  let mockDb: PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PrismaClient;
  });

  it("should skip if lock cannot be acquired", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(false);
    vi.mocked(createRun).mockResolvedValue("run-123");

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(script.run).not.toHaveBeenCalled();
    expect(releaseAdvisoryLock).not.toHaveBeenCalled();
  });

  it("should skip if run cannot be created", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue(null);

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(true);
    expect(script.run).not.toHaveBeenCalled();
  });

  it("should execute script successfully", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
    };

    const mockRunFn = vi.fn().mockResolvedValue(undefined);
    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(acquireAdvisoryLock).toHaveBeenCalledWith(mockDb, "GITHUB:repository");
    expect(createRun).toHaveBeenCalledWith(mockDb, "ds-123", "repository", "batch-1");
    expect(calculateDateRange).toHaveBeenCalledWith(mockDb, "ds-123", "repository", 365);
    expect(mockRunFn).toHaveBeenCalledWith(mockDb, {
      id: "ds-123",
      provider: "GITHUB",
      env: { GITHUB_TOKEN: "token123" },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    });
    expect(completeRun).toHaveBeenCalledWith(mockDb, "run-123", 0, new Date("2024-01-31"));
    expect(releaseAdvisoryLock).toHaveBeenCalledWith(mockDb, "GITHUB:repository");
  });

  it("should handle script failure and record error", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const mockError = new Error("Script execution failed");
    const mockRunFn = vi.fn().mockRejectedValue(mockError);
    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe("Script execution failed");
    expect(failRun).toHaveBeenCalledWith(mockDb, "run-123", "Script execution failed");
    expect(completeRun).not.toHaveBeenCalled();
    expect(releaseAdvisoryLock).toHaveBeenCalledWith(mockDb, "GITHUB:repository");
  });

  it("should always release lock even on error", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockRejectedValue(new Error("Date calc failed"));

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.success).toBe(false);
    expect(releaseAdvisoryLock).toHaveBeenCalledWith(mockDb, "GITHUB:repository");
  });

  it("should handle non-Error throws", async () => {
    // Arrange
    vi.mocked(acquireAdvisoryLock).mockResolvedValue(true);
    vi.mocked(createRun).mockResolvedValue("run-123");
    vi.mocked(calculateDateRange).mockResolvedValue({
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
    });

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const mockRunFn = vi.fn().mockRejectedValue("String error");
    const script = {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: mockRunFn,
    };

    // Act
    const result = await executeScript(mockDb, executionContext as never, script as never, "batch-1");

    // Assert
    expect(result.error).toBe("String error");
    expect(failRun).toHaveBeenCalledWith(mockDb, "run-123", "String error");
  });
});
