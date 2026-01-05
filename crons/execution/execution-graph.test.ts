import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../db.ts";
import type { ScriptError, ScriptExecutionResult } from "../orchestrator/runner.js";
import { buildExecutionGraph } from "./execution-graph.js";

vi.mock("./execute-script.js", () => ({
  executeScript: vi.fn(),
}));

const { executeScript } = await import("./execute-script.js");

describe("buildExecutionGraph", () => {
  let mockDb: DbClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as DbClient;
  });

  it("should create a graph with single node", async () => {
    // Arrange
    const script = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const dataSources = new Map([[script, executionContext]]);
    const executionResults = new Map<string, ScriptExecutionResult>();
    const errors: ScriptError[] = [];

    vi.mocked(executeScript).mockResolvedValue({ success: true, skipped: false });

    // Act
    const graph = buildExecutionGraph(mockDb, dataSources as never, executionResults, errors, "batch-1");
    await graph.run();

    // Assert
    expect(executeScript).toHaveBeenCalledWith(mockDb, executionContext, script, "batch-1");
    expect(executionResults.get("ds-123:repository")).toEqual({ success: true, skipped: false });
    expect(errors).toHaveLength(0);
  });

  it("should track execution results for all scripts", async () => {
    // Arrange
    const script1 = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const script2 = {
      provider: "GITHUB",
      resource: "contributor",
      dependsOn: ["repository"],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const dataSources = new Map([
      [script1, executionContext],
      [script2, executionContext],
    ]);

    const executionResults = new Map<string, ScriptExecutionResult>();
    const errors: ScriptError[] = [];

    vi.mocked(executeScript).mockResolvedValue({ success: true, skipped: false });

    // Act
    const graph = buildExecutionGraph(mockDb, dataSources as never, executionResults, errors, "batch-1");
    await graph.run();

    // Assert
    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(executionResults.size).toBe(2);
    expect(executionResults.get("ds-123:repository")).toEqual({ success: true, skipped: false });
    expect(executionResults.get("ds-123:contributor")).toEqual({ success: true, skipped: false });
  });

  it("should record errors for failed scripts", async () => {
    // Arrange
    const script = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const dataSources = new Map([[script, executionContext]]);
    const executionResults = new Map<string, ScriptExecutionResult>();
    const errors: ScriptError[] = [];

    vi.mocked(executeScript).mockResolvedValue({
      success: false,
      skipped: false,
      error: "Script failed",
    });

    // Act
    const graph = buildExecutionGraph(mockDb, dataSources as never, executionResults, errors, "batch-1");
    await graph.run();

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      script: "GITHUB:repository",
      error: "Script failed",
    });
  });

  it("should not add error for skipped scripts", async () => {
    // Arrange
    const script = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const executionContext = {
      id: "ds-123",
      provider: "GITHUB",
      env: {},
    };

    const dataSources = new Map([[script, executionContext]]);
    const executionResults = new Map<string, ScriptExecutionResult>();
    const errors: ScriptError[] = [];

    vi.mocked(executeScript).mockResolvedValue({
      success: false,
      skipped: true,
    });

    // Act
    const graph = buildExecutionGraph(mockDb, dataSources as never, executionResults, errors, "batch-1");
    await graph.run();

    // Assert
    expect(errors).toHaveLength(0);
    expect(executionResults.get("ds-123:repository")).toEqual({
      success: false,
      skipped: true,
    });
  });

  it("should handle multiple data sources", async () => {
    // Arrange
    const script1 = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const script2 = {
      provider: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    };

    const executionContext1 = {
      id: "ds-1",
      provider: "GITHUB",
      env: {},
    };

    const executionContext2 = {
      id: "ds-2",
      provider: "GITHUB",
      env: {},
    };

    const dataSources = new Map([
      [script1, executionContext1],
      [script2, executionContext2],
    ]);

    const executionResults = new Map<string, ScriptExecutionResult>();
    const errors: ScriptError[] = [];

    vi.mocked(executeScript).mockResolvedValue({ success: true, skipped: false });

    // Act
    const graph = buildExecutionGraph(mockDb, dataSources as never, executionResults, errors, "batch-1");
    await graph.run();

    // Assert
    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(executionResults.has("ds-1:repository")).toBe(true);
    expect(executionResults.has("ds-2:repository")).toBe(true);
  });
});
