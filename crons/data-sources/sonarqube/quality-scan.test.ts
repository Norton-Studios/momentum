import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { qualityScanScript } from "./quality-scan.js";

const mockGetProjectMeasures = vi.fn();
const mockGetProjectAnalyses = vi.fn();

vi.mock("./client.js", () => ({
  createSonarQubeClient: () => ({
    getProjectMeasures: mockGetProjectMeasures,
    getProjectAnalyses: mockGetProjectAnalyses,
    baseUrl: "https://sonarcloud.io",
  }),
}));

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    id: "ds-123",
    runId: "run-123",
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-31"),
    env: {
      SONARQUBE_VARIANT: "cloud",
      SONARQUBE_ORGANIZATION: "test-org",
      SONARQUBE_TOKEN_CLOUD: "token",
    },
    ...overrides,
  } as ExecutionContext;
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    sonarQubeProjectMapping: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    qualityScan: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    dataSourceRun: {
      update: vi.fn().mockResolvedValue({}),
    },
    importLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as unknown as DbClient;
}

describe("qualityScanScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(qualityScanScript.dataSourceName).toBe("SONARQUBE");
    expect(qualityScanScript.resource).toBe("quality-scan");
    expect(qualityScanScript.dependsOn).toEqual(["sonarqube-project"]);
    expect(qualityScanScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof qualityScanScript.run).toBe("function");
  });

  it("should skip projects without repository mapping", async () => {
    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: null }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockGetProjectMeasures).not.toHaveBeenCalled();
    expect(mockDb.qualityScan.upsert).not.toHaveBeenCalled();
  });

  it("should fetch and store quality scans for mapped projects", async () => {
    const mockMeasures = {
      coverage: "85.5",
      new_coverage: "92.0",
      code_smells: "42",
      bugs: "5",
      vulnerabilities: "2",
      duplicated_lines_density: "3.2",
      sqale_debt_ratio: "0.5",
      complexity: "150",
      reliability_rating: "1.0",
      security_rating: "2.0",
      sqale_rating: "1.0",
    };

    const mockAnalyses = [{ key: "AWx123", date: "2024-01-15T10:00:00+0000", revision: "abc123" }];

    mockGetProjectMeasures.mockResolvedValue(mockMeasures);
    mockGetProjectAnalyses.mockResolvedValue(mockAnalyses);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockGetProjectMeasures).toHaveBeenCalledWith("project-1");
    expect(mockGetProjectAnalyses).toHaveBeenCalledWith("project-1", context.startDate);
    expect(mockDb.qualityScan.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.qualityScan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repositoryId_scannedAt: {
            repositoryId: "repo-123",
            scannedAt: new Date("2024-01-15T10:00:00+0000"),
          },
        },
        create: expect.objectContaining({
          repositoryId: "repo-123",
          commitSha: "abc123",
          coveragePercent: 85.5,
          newCodeCoveragePercent: 92.0,
          codeSmellsCount: 42,
          bugsCount: 5,
          vulnerabilitiesCount: 2,
          duplicatedLinesPercent: 3.2,
          technicalDebtRatio: 0.5,
          complexityScore: 150,
          maintainabilityRating: "A",
          reliabilityRating: "A",
          securityRating: "B",
        }),
      })
    );
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should create scan with current date when no analyses exist", async () => {
    const mockMeasures = {
      coverage: "80.0",
      bugs: "3",
    };

    mockGetProjectMeasures.mockResolvedValue(mockMeasures);
    mockGetProjectAnalyses.mockResolvedValue([]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.qualityScan.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should handle multiple analyses", async () => {
    const mockMeasures = { coverage: "85.0" };
    const mockAnalyses = [
      { key: "AWx123", date: "2024-01-15T10:00:00+0000" },
      { key: "AWx456", date: "2024-01-14T10:00:00+0000" },
      { key: "AWx789", date: "2024-01-13T10:00:00+0000" },
    ];

    mockGetProjectMeasures.mockResolvedValue(mockMeasures);
    mockGetProjectAnalyses.mockResolvedValue(mockAnalyses);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.qualityScan.upsert).toHaveBeenCalledTimes(3);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 3 },
    });
  });

  it("should handle multiple projects", async () => {
    const mockMeasures = { coverage: "85.0" };
    const mockAnalyses = [{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }];

    mockGetProjectMeasures.mockResolvedValue(mockMeasures);
    mockGetProjectAnalyses.mockResolvedValue(mockAnalyses);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([
          { projectKey: "project-1", repositoryId: "repo-123" },
          { projectKey: "project-2", repositoryId: "repo-456" },
        ]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockGetProjectMeasures).toHaveBeenCalledTimes(2);
    expect(mockDb.qualityScan.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should map SonarQube ratings correctly", async () => {
    const testCases = [
      { rating: "1.0", expected: "A" },
      { rating: "2.0", expected: "B" },
      { rating: "3.0", expected: "C" },
      { rating: "4.0", expected: "D" },
      { rating: "5.0", expected: "E" },
    ];

    for (const { rating, expected } of testCases) {
      vi.clearAllMocks();

      mockGetProjectMeasures.mockResolvedValue({
        reliability_rating: rating,
        security_rating: rating,
        sqale_rating: rating,
      });
      mockGetProjectAnalyses.mockResolvedValue([{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }]);

      const mockDb = createMockDb({
        sonarQubeProjectMapping: {
          findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
        },
      });
      const context = createMockContext();

      await qualityScanScript.run(mockDb, context);

      expect(mockDb.qualityScan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            reliabilityRating: expected,
            securityRating: expected,
            maintainabilityRating: expected,
          }),
        })
      );
    }
  });

  it("should handle missing measures gracefully", async () => {
    mockGetProjectMeasures.mockResolvedValue({});
    mockGetProjectAnalyses.mockResolvedValue([{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.qualityScan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          coveragePercent: null,
          bugsCount: null,
          reliabilityRating: null,
        }),
      })
    );
  });

  it("should handle errors for individual projects and continue", async () => {
    mockGetProjectMeasures.mockRejectedValueOnce(new Error("API error")).mockResolvedValueOnce({ coverage: "85.0" });
    mockGetProjectAnalyses.mockResolvedValue([{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([
          { projectKey: "project-1", repositoryId: "repo-123" },
          { projectKey: "project-2", repositoryId: "repo-456" },
        ]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.qualityScan.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should log errors when they occur", async () => {
    mockGetProjectMeasures.mockRejectedValue(new Error("Connection failed"));

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import quality scan for project-1: Connection failed",
        details: null,
      },
    });
  });

  it("should not log errors when none occur", async () => {
    mockGetProjectMeasures.mockResolvedValue({ coverage: "85.0" });
    mockGetProjectAnalyses.mockResolvedValue([{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await qualityScanScript.run(mockDb, context);

    expect(mockDb.importLog.create).not.toHaveBeenCalled();
  });
});
