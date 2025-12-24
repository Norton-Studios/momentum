import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createSonarQubeClient } from "./client.js";

export const projectScript = {
  dataSourceName: "SONARQUBE",
  resource: "sonarqube-project",
  dependsOn: [],
  importWindowDays: 365,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createSonarQubeClient(context.env);
    const projects = await client.getProjects();

    const errors: string[] = [];
    let totalProjects = 0;

    for (const project of projects) {
      try {
        const repositoryId = await findMatchingRepository(db, project.key, project.name);

        await db.sonarQubeProjectMapping.upsert({
          where: {
            dataSourceId_projectKey: {
              dataSourceId: context.id,
              projectKey: project.key,
            },
          },
          create: {
            dataSourceId: context.id,
            projectKey: project.key,
            projectName: project.name,
            repositoryId,
          },
          update: {
            projectName: project.name,
            repositoryId,
          },
        });

        totalProjects++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to process project ${project.key}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalProjects },
    });
  },
};

async function findMatchingRepository(db: DbClient, projectKey: string, projectName: string): Promise<string | null> {
  // Strategy 1: Exact match on repository fullName or name
  const repository = await db.repository.findFirst({
    where: {
      OR: [
        { fullName: { contains: projectKey, mode: "insensitive" } },
        { name: { equals: projectKey, mode: "insensitive" } },
        { fullName: { contains: projectName, mode: "insensitive" } },
        { name: { equals: projectName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  if (repository) {
    return repository.id;
  }

  // Strategy 2: Match normalized names (remove common separators)
  const normalizedKey = normalize(projectKey);
  const repositories = await db.repository.findMany({
    select: { id: true, name: true, fullName: true },
  });

  for (const repo of repositories) {
    const normalizedName = normalize(repo.name);
    const normalizedFullName = normalize(repo.fullName);

    if (normalizedName === normalizedKey || normalizedFullName.includes(normalizedKey)) {
      return repo.id;
    }
  }

  return null;
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[-_.:]/g, "");
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
