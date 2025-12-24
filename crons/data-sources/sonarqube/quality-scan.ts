import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createSonarQubeClient, type SonarQubeAnalysis, type SonarQubeMeasures } from "./client.js";

export const qualityScanScript = {
  dataSourceName: "SONARQUBE",
  resource: "quality-scan",
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
    let totalScans = 0;

    for (const mapping of mappings) {
      if (!mapping.repositoryId) {
        continue;
      }

      try {
        // Fetch the current measures for the project
        const measures = await client.getProjectMeasures(mapping.projectKey);

        // Fetch analyses since the start date
        const analyses = await client.getProjectAnalyses(mapping.projectKey, context.startDate);

        if (analyses.length === 0) {
          // If no analyses in the window, create one with current measures
          await upsertQualityScan(db, mapping.repositoryId, { key: "current", date: new Date().toISOString() }, measures);
          totalScans++;
        } else {
          // Create a quality scan for each analysis
          for (const analysis of analyses) {
            await upsertQualityScan(db, mapping.repositoryId, analysis, measures);
            totalScans++;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import quality scan for ${mapping.projectKey}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalScans },
    });
  },
};

async function upsertQualityScan(db: DbClient, repositoryId: string, analysis: SonarQubeAnalysis, measures: SonarQubeMeasures) {
  const scannedAt = new Date(analysis.date);

  await db.qualityScan.upsert({
    where: {
      repositoryId_scannedAt: {
        repositoryId,
        scannedAt,
      },
    },
    create: {
      repositoryId,
      commitSha: analysis.revision ?? null,
      coveragePercent: parseFloatOrNull(measures.coverage),
      newCodeCoveragePercent: parseFloatOrNull(measures.new_coverage),
      codeSmellsCount: parseIntOrNull(measures.code_smells),
      bugsCount: parseIntOrNull(measures.bugs),
      vulnerabilitiesCount: parseIntOrNull(measures.vulnerabilities),
      duplicatedLinesPercent: parseFloatOrNull(measures.duplicated_lines_density),
      technicalDebtRatio: parseFloatOrNull(measures.sqale_debt_ratio),
      complexityScore: parseIntOrNull(measures.complexity),
      maintainabilityRating: mapRating(measures.sqale_rating),
      reliabilityRating: mapRating(measures.reliability_rating),
      securityRating: mapRating(measures.security_rating),
      scannedAt,
    },
    update: {
      commitSha: analysis.revision ?? null,
      coveragePercent: parseFloatOrNull(measures.coverage),
      newCodeCoveragePercent: parseFloatOrNull(measures.new_coverage),
      codeSmellsCount: parseIntOrNull(measures.code_smells),
      bugsCount: parseIntOrNull(measures.bugs),
      vulnerabilitiesCount: parseIntOrNull(measures.vulnerabilities),
      duplicatedLinesPercent: parseFloatOrNull(measures.duplicated_lines_density),
      technicalDebtRatio: parseFloatOrNull(measures.sqale_debt_ratio),
      complexityScore: parseIntOrNull(measures.complexity),
      maintainabilityRating: mapRating(measures.sqale_rating),
      reliabilityRating: mapRating(measures.reliability_rating),
      securityRating: mapRating(measures.security_rating),
    },
  });
}

function parseFloatOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIntOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapRating(rating: string | undefined): string | null {
  if (!rating) return null;
  const numRating = parseFloat(rating);
  if (Number.isNaN(numRating)) return null;
  // SonarQube returns ratings as numbers: 1.0=A, 2.0=B, 3.0=C, 4.0=D, 5.0=E
  if (numRating <= 1) return "A";
  if (numRating <= 2) return "B";
  if (numRating <= 3) return "C";
  if (numRating <= 4) return "D";
  return "E";
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
