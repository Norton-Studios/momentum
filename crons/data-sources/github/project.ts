import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { PrismaClient } from "@prisma/client";

export const projectScript = {
  dataSourceName: "GITHUB",
  resource: "project",
  dependsOn: ["repository"],
  importWindowDays: 365,

  async run(db: PrismaClient, context: ExecutionContext) {
    const repos = await db.repository.findMany({
      where: {
        provider: "GITHUB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalProjects = 0;

    for (const repo of repos) {
      const result = await processRepositoryProject(db, repo);
      if (result.error) {
        errors.push(result.error);
      }
      totalProjects += result.count;
    }

    if (errors.length > 0) {
      await logProjectErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalProjects },
    });
  },
};

async function processRepositoryProject(
  db: PrismaClient,
  repo: { id: string; fullName: string; name: string; url: string | null; description: string | null }
): Promise<{ count: number; error?: string }> {
  try {
    await upsertProject(db, repo);
    return { count: 1 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to create project for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

async function upsertProject(db: PrismaClient, repo: { id: string; fullName: string; name: string; url: string | null; description: string | null }): Promise<void> {
  await db.project.upsert({
    where: { key: repo.fullName },
    create: {
      name: repo.name,
      key: repo.fullName,
      description: repo.description,
      provider: "GITHUB",
      url: repo.url,
    },
    update: {
      name: repo.name,
      description: repo.description,
      url: repo.url,
    },
  });
}

async function logProjectErrors(db: PrismaClient, runId: string, errors: string[]): Promise<void> {
  if (errors.length === 0) return;

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
