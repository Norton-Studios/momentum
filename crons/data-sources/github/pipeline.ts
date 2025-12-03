import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { PrismaClient } from "@prisma/client";

export const pipelineScript = {
  dataSourceName: "GITHUB",
  resource: "pipeline",
  dependsOn: ["repository"],
  importWindowDays: 365,

  async run(db: PrismaClient, context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITHUB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalPipelines = 0;

    for (const repo of repos) {
      const result = await processRepositoryPipelines(octokit, db, repo);
      if (result.error) {
        errors.push(result.error);
      }
      totalPipelines += result.count;
    }

    if (errors.length > 0) {
      await logPipelineErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalPipelines },
    });
  },
};

async function fetchWorkflows(octokit: Octokit, owner: string, repoName: string): Promise<GitHubWorkflow[]> {
  const allWorkflows: GitHubWorkflow[] = [];

  for await (const response of octokit.paginate.iterator(octokit.actions.listRepoWorkflows, {
    owner,
    repo: repoName,
    per_page: 100,
  })) {
    allWorkflows.push(...response.data);
  }

  return allWorkflows;
}

async function upsertPipeline(db: PrismaClient, repoId: string, workflow: GitHubWorkflow): Promise<void> {
  const existing = await db.pipeline.findFirst({
    where: {
      repositoryId: repoId,
      configPath: workflow.path,
    },
  });

  if (existing) {
    await db.pipeline.update({
      where: { id: existing.id },
      data: {
        name: workflow.name,
        isActive: workflow.state === "active",
      },
    });
  } else {
    await db.pipeline.create({
      data: {
        name: workflow.name,
        provider: "GITHUB_ACTIONS",
        repositoryId: repoId,
        configPath: workflow.path,
        isActive: workflow.state === "active",
      },
    });
  }
}

async function processRepositoryPipelines(octokit: Octokit, db: PrismaClient, repo: { id: string; fullName: string }): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = repo.fullName.split("/");
    const workflows = await fetchWorkflows(octokit, owner, repoName);

    let successCount = 0;
    for (const workflow of workflows) {
      try {
        await upsertPipeline(db, repo.id, workflow);
        successCount++;
      } catch (error) {
        console.error(`Failed to store workflow ${workflow.name}:`, error);
      }
    }

    return { count: successCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import pipelines for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

async function logPipelineErrors(db: PrismaClient, runId: string, errors: string[]): Promise<void> {
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

interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}
