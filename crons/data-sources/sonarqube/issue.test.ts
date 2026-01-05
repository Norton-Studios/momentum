import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DbClient } from "../../db.ts";
import { issueScript } from "./issue.js";

const mockGetIssues = vi.fn();

vi.mock("./client.js", () => ({
  createSonarQubeClient: () => ({
    getIssues: mockGetIssues,
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
    securityVulnerability: {
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

describe("issueScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(issueScript.dataSourceName).toBe("SONARQUBE");
    expect(issueScript.resource).toBe("sonarqube-issue");
    expect(issueScript.dependsOn).toEqual(["sonarqube-project"]);
    expect(issueScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof issueScript.run).toBe("function");
  });

  it("should skip projects without repository mapping", async () => {
    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: null }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockGetIssues).not.toHaveBeenCalled();
    expect(mockDb.securityVulnerability.upsert).not.toHaveBeenCalled();
  });

  it("should fetch and store vulnerabilities for mapped projects", async () => {
    const mockIssues = [
      {
        key: "issue-1",
        rule: "java:S123",
        severity: "CRITICAL",
        component: "src/Main.java",
        project: "project-1",
        message: "Fix this SQL injection vulnerability",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
    ];

    mockGetIssues.mockResolvedValue(mockIssues);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockGetIssues).toHaveBeenCalledWith("project-1", ["VULNERABILITY"], context.startDate);
    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repositoryId_title: {
            repositoryId: "repo-123",
            title: "issue-1",
          },
        },
        create: expect.objectContaining({
          repositoryId: "repo-123",
          title: "issue-1",
          description: "Fix this SQL injection vulnerability",
          severity: "HIGH",
          status: "OPEN",
          affectedComponent: "src/Main.java",
          url: expect.stringContaining("sonarcloud.io/project/issues"),
        }),
      })
    );
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should map SonarQube severities correctly", async () => {
    const severityMappings = [
      { sonarSeverity: "BLOCKER", expected: "CRITICAL" },
      { sonarSeverity: "CRITICAL", expected: "HIGH" },
      { sonarSeverity: "MAJOR", expected: "MEDIUM" },
      { sonarSeverity: "MINOR", expected: "LOW" },
      { sonarSeverity: "INFO", expected: "INFORMATIONAL" },
      { sonarSeverity: "UNKNOWN", expected: "MEDIUM" },
    ];

    for (const { sonarSeverity, expected } of severityMappings) {
      vi.clearAllMocks();

      mockGetIssues.mockResolvedValue([
        {
          key: `issue-${sonarSeverity}`,
          rule: "java:S123",
          severity: sonarSeverity,
          component: "src/Main.java",
          project: "project-1",
          message: "Test issue",
          status: "OPEN",
          type: "VULNERABILITY",
          creationDate: "2024-01-15T10:00:00+0000",
          updateDate: "2024-01-15T10:00:00+0000",
        },
      ]);

      const mockDb = createMockDb({
        sonarQubeProjectMapping: {
          findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
        },
      });
      const context = createMockContext();

      await issueScript.run(mockDb, context);

      expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            severity: expected,
          }),
        })
      );
    }
  });

  it("should map SonarQube statuses correctly", async () => {
    const statusMappings = [
      { status: "OPEN", resolution: undefined, expected: "OPEN" },
      { status: "CONFIRMED", resolution: undefined, expected: "IN_PROGRESS" },
      { status: "REOPENED", resolution: undefined, expected: "IN_PROGRESS" },
      { status: "RESOLVED", resolution: "FIXED", expected: "RESOLVED" },
      { status: "RESOLVED", resolution: "FALSE-POSITIVE", expected: "FALSE_POSITIVE" },
      { status: "RESOLVED", resolution: "WONTFIX", expected: "WONT_FIX" },
    ];

    for (const { status, resolution, expected } of statusMappings) {
      vi.clearAllMocks();

      mockGetIssues.mockResolvedValue([
        {
          key: `issue-${status}-${resolution || "none"}`,
          rule: "java:S123",
          severity: "MAJOR",
          component: "src/Main.java",
          project: "project-1",
          message: "Test issue",
          status,
          resolution,
          type: "VULNERABILITY",
          creationDate: "2024-01-15T10:00:00+0000",
          updateDate: "2024-01-16T10:00:00+0000",
        },
      ]);

      const mockDb = createMockDb({
        sonarQubeProjectMapping: {
          findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
        },
      });
      const context = createMockContext();

      await issueScript.run(mockDb, context);

      expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            status: expected,
          }),
        })
      );
    }
  });

  it("should set resolvedAt when resolution exists", async () => {
    mockGetIssues.mockResolvedValue([
      {
        key: "issue-resolved",
        rule: "java:S123",
        severity: "MAJOR",
        component: "src/Main.java",
        project: "project-1",
        message: "Fixed issue",
        status: "RESOLVED",
        resolution: "FIXED",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-20T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resolvedAt: new Date("2024-01-20T10:00:00+0000"),
        }),
      })
    );
  });

  it("should set resolvedAt to null when no resolution", async () => {
    mockGetIssues.mockResolvedValue([
      {
        key: "issue-open",
        rule: "java:S123",
        severity: "MAJOR",
        component: "src/Main.java",
        project: "project-1",
        message: "Open issue",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          resolvedAt: null,
        }),
      })
    );
  });

  it("should handle multiple issues", async () => {
    mockGetIssues.mockResolvedValue([
      {
        key: "issue-1",
        rule: "java:S123",
        severity: "CRITICAL",
        component: "src/Main.java",
        project: "project-1",
        message: "Issue 1",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
      {
        key: "issue-2",
        rule: "java:S456",
        severity: "MAJOR",
        component: "src/Other.java",
        project: "project-1",
        message: "Issue 2",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-14T10:00:00+0000",
        updateDate: "2024-01-14T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle multiple projects", async () => {
    mockGetIssues.mockResolvedValue([
      {
        key: "issue-1",
        rule: "java:S123",
        severity: "MAJOR",
        component: "src/Main.java",
        project: "project-1",
        message: "Test issue",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([
          { projectKey: "project-1", repositoryId: "repo-123" },
          { projectKey: "project-2", repositoryId: "repo-456" },
        ]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockGetIssues).toHaveBeenCalledTimes(2);
    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should generate correct issue URL", async () => {
    mockGetIssues.mockResolvedValue([
      {
        key: "AWxyz123",
        rule: "java:S123",
        severity: "MAJOR",
        component: "src/Main.java",
        project: "my-project-key",
        message: "Test issue",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "my-project-key", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          url: "https://sonarcloud.io/project/issues?id=my-project-key&open=AWxyz123",
        }),
      })
    );
  });

  it("should handle errors for individual projects and continue", async () => {
    mockGetIssues.mockRejectedValueOnce(new Error("API error")).mockResolvedValueOnce([
      {
        key: "issue-1",
        rule: "java:S123",
        severity: "MAJOR",
        component: "src/Main.java",
        project: "project-2",
        message: "Test issue",
        status: "OPEN",
        type: "VULNERABILITY",
        creationDate: "2024-01-15T10:00:00+0000",
        updateDate: "2024-01-15T10:00:00+0000",
      },
    ]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([
          { projectKey: "project-1", repositoryId: "repo-123" },
          { projectKey: "project-2", repositoryId: "repo-456" },
        ]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.securityVulnerability.upsert).toHaveBeenCalledTimes(1);
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 1 },
    });
  });

  it("should log errors when they occur", async () => {
    mockGetIssues.mockRejectedValue(new Error("Connection failed"));

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.importLog.create).toHaveBeenCalledWith({
      data: {
        dataSourceRunId: "run-123",
        level: "ERROR",
        message: "Failed to import issues for project-1: Connection failed",
        details: null,
      },
    });
  });

  it("should not log errors when none occur", async () => {
    mockGetIssues.mockResolvedValue([]);

    const mockDb = createMockDb({
      sonarQubeProjectMapping: {
        findMany: vi.fn().mockResolvedValue([{ projectKey: "project-1", repositoryId: "repo-123" }]),
      },
    });
    const context = createMockContext();

    await issueScript.run(mockDb, context);

    expect(mockDb.importLog.create).not.toHaveBeenCalled();
  });
});
