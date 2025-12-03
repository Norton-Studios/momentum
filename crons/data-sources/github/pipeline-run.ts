import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { PipelineStatus, PrismaClient } from "@prisma/client";

export const pipelineRunScript = {
  dataSourceName: "GITHUB",
  resource: "pipeline-run",
  dependsOn: ["repository", "pipeline"],
  importWindowDays: 90,

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
    let totalRuns = 0;

    for (const repo of repos) {
      const result = await processRepositoryPipelineRuns(octokit, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalRuns += result.count;
    }

    if (errors.length > 0) {
      await logPipelineRunErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalRuns },
    });
  },
};

function mapGitHubStatusToPipelineStatus(status: string | null, conclusion: string | null): PipelineStatus {
  if (status === "queued" || status === "waiting" || status === "pending") return "PENDING";
  if (status === "in_progress") return "RUNNING";

  if (conclusion === "success") return "SUCCESS";
  if (conclusion === "failure") return "FAILED";
  if (conclusion === "cancelled") return "CANCELLED";
  if (conclusion === "skipped") return "SKIPPED";

  return "PENDING";
}

function isWithinDateRange(createdAt: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(createdAt);
  return date >= startDate && date <= endDate;
}

function shouldStopPaginating(oldestRun: GitHubWorkflowRun, startDate: Date): boolean {
  return new Date(oldestRun.created_at) < startDate;
}

async function fetchWorkflowRuns(octokit: Octokit, owner: string, repoName: string, startDate: Date, endDate: Date): Promise<GitHubWorkflowRun[]> {
  const allRuns: GitHubWorkflowRun[] = [];

  for await (const response of octokit.paginate.iterator(octokit.actions.listWorkflowRunsForRepo, {
    owner,
    repo: repoName,
    per_page: 100,
  })) {
    const runs = response.data as GitHubWorkflowRun[];
    const filteredRuns = runs.filter((run) => isWithinDateRange(run.created_at, startDate, endDate));
    allRuns.push(...filteredRuns);

    const oldestRun = runs[runs.length - 1];
    if (oldestRun && shouldStopPaginating(oldestRun, startDate)) {
      break;
    }
  }

  return allRuns;
}

async function fetchWorkflowRunJobs(octokit: Octokit, owner: string, repoName: string, runId: number): Promise<GitHubJob[]> {
  const allJobs: GitHubJob[] = [];

  for await (const response of octokit.paginate.iterator(octokit.actions.listJobsForWorkflowRun, {
    owner,
    repo: repoName,
    run_id: runId,
    per_page: 100,
  })) {
    allJobs.push(...(response.data as GitHubJob[]));
  }

  return allJobs;
}

function calculateDuration(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) return null;
  return new Date(completedAt).getTime() - new Date(startedAt).getTime();
}

async function findPipelineByConfigPath(db: PrismaClient, repoId: string, workflowPath: string): Promise<string | null> {
  const pipeline = await db.pipeline.findFirst({
    where: {
      repositoryId: repoId,
      configPath: workflowPath,
    },
    select: { id: true },
  });
  return pipeline?.id ?? null;
}

async function upsertPipelineRun(db: PrismaClient, pipelineId: string, run: GitHubWorkflowRun): Promise<string> {
  const status = mapGitHubStatusToPipelineStatus(run.status, run.conclusion);
  const durationMs = calculateDuration(run.run_started_at, run.updated_at);

  const existing = await db.pipelineRun.findUnique({
    where: {
      pipelineId_runNumber: {
        pipelineId,
        runNumber: run.run_number,
      },
    },
  });

  if (existing) {
    await db.pipelineRun.update({
      where: { id: existing.id },
      data: {
        status,
        branch: run.head_branch,
        commitSha: run.head_sha,
        triggerEvent: run.event,
        url: run.html_url,
        durationMs,
        startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
        completedAt: run.updated_at && status !== "RUNNING" ? new Date(run.updated_at) : null,
      },
    });
    return existing.id;
  }

  const created = await db.pipelineRun.create({
    data: {
      pipelineId,
      runNumber: run.run_number,
      status,
      branch: run.head_branch,
      commitSha: run.head_sha,
      triggerEvent: run.event,
      url: run.html_url,
      durationMs,
      startedAt: run.run_started_at ? new Date(run.run_started_at) : null,
      completedAt: run.updated_at && status !== "RUNNING" ? new Date(run.updated_at) : null,
    },
  });
  return created.id;
}

async function upsertPipelineStages(db: PrismaClient, pipelineRunId: string, jobs: GitHubJob[]): Promise<void> {
  for (const job of jobs) {
    const status = mapGitHubStatusToPipelineStatus(job.status, job.conclusion);
    const durationMs = calculateDuration(job.started_at, job.completed_at);

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
          startedAt: job.started_at ? new Date(job.started_at) : null,
          completedAt: job.completed_at ? new Date(job.completed_at) : null,
        },
      });
    } else {
      await db.pipelineStage.create({
        data: {
          pipelineRunId,
          name: job.name,
          status,
          durationMs,
          startedAt: job.started_at ? new Date(job.started_at) : null,
          completedAt: job.completed_at ? new Date(job.completed_at) : null,
        },
      });
    }
  }
}

async function processRepositoryPipelineRuns(
  octokit: Octokit,
  db: PrismaClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = repo.fullName.split("/");
    const workflowRuns = await fetchWorkflowRuns(octokit, owner, repoName, startDate, endDate);

    let successCount = 0;

    for (const run of workflowRuns) {
      try {
        const pipelineId = await findPipelineByConfigPath(db, repo.id, run.path);
        if (!pipelineId) {
          continue;
        }

        const pipelineRunId = await upsertPipelineRun(db, pipelineId, run);

        const jobs = await fetchWorkflowRunJobs(octokit, owner, repoName, run.id);
        await upsertPipelineStages(db, pipelineRunId, jobs);

        successCount++;
      } catch (error) {
        console.error(`Failed to store workflow run #${run.run_number}:`, error);
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

async function logPipelineRunErrors(db: PrismaClient, runId: string, errors: string[]): Promise<void> {
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

interface GitHubWorkflowRun {
  id: number;
  run_number: number;
  status: string | null;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
  event: string;
  html_url: string;
  path: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
}

interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}
