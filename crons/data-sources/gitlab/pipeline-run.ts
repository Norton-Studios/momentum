import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { DbClient } from "~/db.server.js";
import type { PipelineStatus } from "../../db.ts";

export const pipelineRunScript = {
  dataSourceName: "GITLAB",
  resource: "pipeline-run",
  dependsOn: ["repository", "pipeline"],
  importWindowDays: 90,

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
    let totalRuns = 0;

    for (const repo of repos) {
      const result = await processRepositoryPipelineRuns(gitlab, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalRuns += result.count;
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
      data: { recordsImported: totalRuns },
    });
  },
};

function mapGitLabStatusToPipelineStatus(status: string): PipelineStatus {
  switch (status) {
    case "created":
    case "waiting_for_resource":
    case "preparing":
    case "pending":
      return "PENDING";
    case "running":
      return "RUNNING";
    case "success":
      return "SUCCESS";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELLED";
    case "skipped":
      return "SKIPPED";
    case "manual":
      return "PENDING";
    case "scheduled":
      return "PENDING";
    default:
      return "PENDING";
  }
}

async function fetchPipelineRuns(gitlab: InstanceType<typeof Gitlab>, projectId: number, startDate: Date, endDate: Date): Promise<GitLabPipeline[]> {
  const pipelines = (await gitlab.Pipelines.all(projectId, {
    updatedAfter: startDate.toISOString(),
    updatedBefore: endDate.toISOString(),
    perPage: 100,
  })) as unknown as GitLabPipeline[];

  return pipelines;
}

async function fetchPipelineJobs(gitlab: InstanceType<typeof Gitlab>, projectId: number, pipelineId: number): Promise<GitLabJob[]> {
  const jobs = (await gitlab.Jobs.all(projectId, { pipelineId, perPage: 100 })) as GitLabJob[];
  return jobs;
}

function calculateDuration(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

async function findPipelineForRepo(db: DbClient, repoId: string): Promise<string | null> {
  const pipeline = await db.pipeline.findFirst({
    where: {
      repositoryId: repoId,
      configPath: ".gitlab-ci.yml",
    },
    select: { id: true },
  });
  return pipeline?.id ?? null;
}

async function upsertPipelineRun(db: DbClient, pipelineId: string, run: GitLabPipeline): Promise<string> {
  const status = mapGitLabStatusToPipelineStatus(run.status);
  const durationMs = run.duration ? run.duration * 1000 : calculateDuration(run.startedAt, run.finishedAt);

  const existing = await db.pipelineRun.findUnique({
    where: {
      pipelineId_runNumber: {
        pipelineId,
        runNumber: run.id,
      },
    },
  });

  if (existing) {
    await db.pipelineRun.update({
      where: { id: existing.id },
      data: {
        status,
        branch: run.ref,
        commitSha: run.sha,
        triggerEvent: run.source,
        url: run.webUrl,
        durationMs,
        startedAt: run.startedAt ? new Date(run.startedAt) : null,
        completedAt: run.finishedAt ? new Date(run.finishedAt) : null,
      },
    });
    return existing.id;
  }

  const created = await db.pipelineRun.create({
    data: {
      pipelineId,
      runNumber: run.id,
      status,
      branch: run.ref,
      commitSha: run.sha,
      triggerEvent: run.source,
      url: run.webUrl,
      durationMs,
      startedAt: run.startedAt ? new Date(run.startedAt) : null,
      completedAt: run.finishedAt ? new Date(run.finishedAt) : null,
    },
  });
  return created.id;
}

async function upsertPipelineStages(db: DbClient, pipelineRunId: string, jobs: GitLabJob[]): Promise<void> {
  for (const job of jobs) {
    const status = mapGitLabStatusToPipelineStatus(job.status);
    const durationMs = job.duration ? job.duration * 1000 : calculateDuration(job.startedAt, job.finishedAt);

    const existing = await db.pipelineStage.findFirst({
      where: {
        pipelineRunId,
        name: job.name,
      },
    });

    if (existing) {
      await db.pipelineStage.update({
        where: { id: existing.id },
        data: {
          status,
          durationMs,
          startedAt: job.startedAt ? new Date(job.startedAt) : null,
          completedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        },
      });
    } else {
      await db.pipelineStage.create({
        data: {
          pipelineRunId,
          name: job.name,
          status,
          durationMs,
          startedAt: job.startedAt ? new Date(job.startedAt) : null,
          completedAt: job.finishedAt ? new Date(job.finishedAt) : null,
        },
      });
    }
  }
}

async function processRepositoryPipelineRuns(
  gitlab: InstanceType<typeof Gitlab>,
  db: DbClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const pipelineId = await findPipelineForRepo(db, repo.id);
    if (!pipelineId) {
      return { count: 0 };
    }

    const project = await gitlab.Projects.show(repo.fullName);
    const pipelineRuns = await fetchPipelineRuns(gitlab, project.id, startDate, endDate);

    let successCount = 0;

    for (const run of pipelineRuns) {
      try {
        const pipelineRunId = await upsertPipelineRun(db, pipelineId, run);

        const jobs = await fetchPipelineJobs(gitlab, project.id, run.id);
        await upsertPipelineStages(db, pipelineRunId, jobs);

        successCount++;
      } catch (error) {
        console.error(`Failed to store pipeline run #${run.id}:`, error);
      }
    }

    return { count: successCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import pipeline runs for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

interface GitLabPipeline {
  id: number;
  status: string;
  ref: string;
  sha: string;
  source: string;
  webUrl: string;
  duration: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

interface GitLabJob {
  id: number;
  name: string;
  status: string;
  duration: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}
