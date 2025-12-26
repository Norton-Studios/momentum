import { PrismaClient } from "@prisma/client";
import { TEST_DB_URL } from "./playwright.config";

let prisma: PrismaClient | null = null;

function getClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DB_URL,
        },
      },
    });
  }
  return prisma;
}

export async function resetDatabase() {
  const client = getClient();

  // Truncate all tables in reverse dependency order
  // CASCADE handles foreign key constraints
  const tableNames = [
    "import_log",
    "data_source_run",
    "import_batch",
    "data_source_config",
    "data_source",
    "issue_status_transition",
    "issue",
    "sprint",
    "board",
    "project",
    "sonar_qube_project_mapping",
    "security_vulnerability",
    "coverage_metric",
    "quality_scan",
    "pipeline_stage",
    "pipeline_run",
    "pipeline",
    "pull_request_review",
    "pull_request",
    "commit",
    "contributor",
    "team_project",
    "team_repository",
    "repository",
    "team",
    "organization",
    "user",
  ];

  for (const table of tableNames) {
    await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
