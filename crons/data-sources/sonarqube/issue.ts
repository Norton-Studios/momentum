import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { VulnerabilitySeverity, VulnerabilityStatus } from "@prisma/client";
import type { DbClient } from "~/db.server.js";
import { createSonarQubeClient, type SonarQubeIssue } from "./client.js";

export const issueScript = {
  dataSourceName: "SONARQUBE",
  resource: "sonarqube-issue",
  dependsOn: ["sonarqube-project"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createSonarQubeClient(context.env);

    // Get all mapped projects with linked repositories
    const mappings = await db.sonarQubeProjectMapping.findMany({
      where: {
        dataSourceId: context.id,
        repositoryId: { not: null },
      },
      select: {
        projectKey: true,
        repositoryId: true,
      },
    });

    const errors: string[] = [];
    let totalIssues = 0;

    for (const mapping of mappings) {
      if (!mapping.repositoryId) {
        continue;
      }

      try {
        // Fetch VULNERABILITY type issues
        const issues = await client.getIssues(mapping.projectKey, ["VULNERABILITY"], context.startDate);

        for (const issue of issues) {
          await upsertVulnerability(db, mapping.repositoryId, issue, client.baseUrl);
          totalIssues++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import issues for ${mapping.projectKey}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalIssues },
    });
  },
};

async function upsertVulnerability(db: DbClient, repositoryId: string, issue: SonarQubeIssue, baseUrl: string) {
  const severity = mapSeverity(issue.severity);
  const status = mapStatus(issue.status, issue.resolution);
  const issueUrl = `${baseUrl}/project/issues?id=${encodeURIComponent(issue.project)}&open=${issue.key}`;

  await db.securityVulnerability.upsert({
    where: {
      repositoryId_title: {
        repositoryId,
        title: issue.key,
      },
    },
    create: {
      repositoryId,
      title: issue.key,
      description: issue.message,
      severity,
      status,
      affectedComponent: issue.component,
      url: issueUrl,
      discoveredAt: new Date(issue.creationDate),
      resolvedAt: issue.resolution ? new Date(issue.updateDate) : null,
    },
    update: {
      description: issue.message,
      severity,
      status,
      affectedComponent: issue.component,
      url: issueUrl,
      resolvedAt: issue.resolution ? new Date(issue.updateDate) : null,
    },
  });
}

function mapSeverity(severity: string): VulnerabilitySeverity {
  switch (severity.toUpperCase()) {
    case "BLOCKER":
      return "CRITICAL";
    case "CRITICAL":
      return "HIGH";
    case "MAJOR":
      return "MEDIUM";
    case "MINOR":
      return "LOW";
    case "INFO":
      return "INFORMATIONAL";
    default:
      return "MEDIUM";
  }
}

function mapStatus(status: string, resolution?: string): VulnerabilityStatus {
  if (resolution === "FALSE-POSITIVE") return "FALSE_POSITIVE";
  if (resolution === "WONTFIX") return "WONT_FIX";
  if (resolution === "FIXED") return "RESOLVED";
  if (status === "CONFIRMED" || status === "REOPENED") return "IN_PROGRESS";
  return "OPEN";
}

async function logErrors(db: DbClient, runId: string, errors: string[]) {
  await Promise.all(
    errors.map((message) =>
      db.importLog.create({
        data: {
          dataSourceRunId: runId,
          level: "ERROR",
          message,
          details: null,
        },
      })
    )
  );
}
