import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { DbClient } from "~/db.server.js";

export const pipelineScript = {
  dataSourceName: "GITLAB",
  resource: "pipeline",
  dependsOn: ["repository"],
  importWindowDays: 365,

  async run(db: DbClient, context: ExecutionContext) {
    const gitlab = new Gitlab({ token: context.env.GITLAB_TOKEN, host: context.env.GITLAB_HOST || "https://gitlab.com" });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITLAB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalPipelines = 0;

    for (const repo of repos) {
      const result = await processRepositoryPipeline(gitlab, db, repo);
      if (result.error) {
        errors.push(result.error);
      }
      totalPipelines += result.count;
    }

    if (errors.length > 0) {
      await Promise.all(
        errors.map((message) =>
          db.importLog.create({
            data: {
              dataSourceRunId: context.runId,
              level: "ERROR",
              message,
              details: null,
            },
          })
        )
      );
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalPipelines },
    });
  },
};

async function checkProjectHasPipelines(gitlab: InstanceType<typeof Gitlab>, projectId: number): Promise<boolean> {
  const pipelines = await gitlab.Pipelines.all(projectId, { perPage: 1 });
  return pipelines.length > 0;
}

async function upsertPipeline(db: DbClient, repoId: string, repoFullName: string, hasPipelines: boolean): Promise<void> {
  const configPath = ".gitlab-ci.yml";

  const existing = await db.pipeline.findFirst({
    where: {
      repositoryId: repoId,
      configPath,
    },
  });

  if (existing) {
    await db.pipeline.update({
      where: { id: existing.id },
      data: {
        name: `${repoFullName} CI`,
        isActive: hasPipelines,
      },
    });
  } else if (hasPipelines) {
    await db.pipeline.create({
      data: {
        name: `${repoFullName} CI`,
        provider: "GITLAB_CI",
        repositoryId: repoId,
        configPath,
        isActive: true,
      },
    });
  }
}

async function processRepositoryPipeline(gitlab: InstanceType<typeof Gitlab>, db: DbClient, repo: { id: string; fullName: string }): Promise<{ count: number; error?: string }> {
  try {
    const project = await gitlab.Projects.show(repo.fullName);
    const hasPipelines = await checkProjectHasPipelines(gitlab, project.id);

    await upsertPipeline(db, repo.id, repo.fullName, hasPipelines);

    return { count: hasPipelines ? 1 : 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import pipeline for ${repo.fullName}: ${errorMessage}`,
    };
  }
}
