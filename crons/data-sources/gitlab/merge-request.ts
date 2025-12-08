import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { PullRequestState } from "@prisma/client";
import type { DbClient } from "~/db.server.js";

export const mergeRequestScript = {
  dataSourceName: "GITLAB",
  resource: "pull-request",
  dependsOn: ["repository", "contributor"],
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
    let totalMergeRequests = 0;

    for (const repo of repos) {
      const result = await processProjectMergeRequests(gitlab, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalMergeRequests += result.count;
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
      data: { recordsImported: totalMergeRequests },
    });
  },
};

function mapGitLabStateToPullRequestState(state: string, draft: boolean, mergedAt: string | null | undefined): PullRequestState {
  if (draft) return "DRAFT";
  if (state === "merged" || mergedAt) return "MERGED";
  if (state === "closed") return "CLOSED";
  return "OPEN";
}

function isWithinDateRange(updatedAt: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(updatedAt);
  return date >= startDate && date <= endDate;
}

async function fetchMergeRequestsForProject(gitlab: InstanceType<typeof Gitlab>, projectId: number, startDate: Date, endDate: Date): Promise<GitLabMergeRequest[]> {
  const allMergeRequests: GitLabMergeRequest[] = [];

  const mergeRequests = (await gitlab.MergeRequests.all({
    projectId,
    updatedAfter: startDate.toISOString(),
    updatedBefore: endDate.toISOString(),
    perPage: 100,
  })) as GitLabMergeRequest[];

  for (const mr of mergeRequests) {
    if (isWithinDateRange(mr.updatedAt, startDate, endDate)) {
      allMergeRequests.push(mr);
    }
  }

  return allMergeRequests;
}

function transformMergeRequest(mr: GitLabMergeRequest): TransformedMergeRequest {
  const isDraft = mr.workInProgress || mr.draft || mr.title.startsWith("Draft:") || mr.title.startsWith("WIP:");

  return {
    number: mr.iid,
    title: mr.title,
    description: mr.description,
    state: mapGitLabStateToPullRequestState(mr.state, isDraft, mr.mergedAt),
    authorEmail: mr.author?.email || `${mr.author?.username || "unknown"}@gitlab.com`,
    authorName: mr.author?.name || mr.author?.username || "unknown",
    authorUsername: mr.author?.username,
    assigneeEmail: mr.assignee ? mr.assignee.email || `${mr.assignee.username}@gitlab.com` : undefined,
    assigneeUsername: mr.assignee?.username,
    sourceBranch: mr.sourceBranch,
    targetBranch: mr.targetBranch,
    url: mr.webUrl,
    mergedAt: mr.mergedAt ? new Date(mr.mergedAt) : null,
    closedAt: mr.closedAt ? new Date(mr.closedAt) : null,
  };
}

async function upsertMergeRequest(db: DbClient, repoId: string, transformedMR: TransformedMergeRequest, authorId: string, assigneeId?: string): Promise<void> {
  await db.pullRequest.upsert({
    where: {
      repositoryId_number: {
        repositoryId: repoId,
        number: transformedMR.number,
      },
    },
    create: {
      number: transformedMR.number,
      title: transformedMR.title,
      description: transformedMR.description,
      state: transformedMR.state,
      authorId,
      assigneeId,
      repositoryId: repoId,
      sourceBranch: transformedMR.sourceBranch,
      targetBranch: transformedMR.targetBranch,
      url: transformedMR.url,
      linesAdded: 0,
      linesRemoved: 0,
      filesChanged: 0,
      commitsCount: 0,
      mergedAt: transformedMR.mergedAt,
      closedAt: transformedMR.closedAt,
    },
    update: {
      title: transformedMR.title,
      description: transformedMR.description,
      state: transformedMR.state,
      assigneeId,
      linesAdded: 0,
      linesRemoved: 0,
      filesChanged: 0,
      commitsCount: 0,
      mergedAt: transformedMR.mergedAt,
      closedAt: transformedMR.closedAt,
    },
  });
}

async function storeMergeRequests(db: DbClient, repoId: string, mrs: GitLabMergeRequest[]): Promise<number> {
  let successCount = 0;

  for (const mr of mrs) {
    try {
      const transformedMR = transformMergeRequest(mr);
      const author = await db.contributor.upsert({
        where: {
          provider_email: {
            provider: "GITLAB",
            email: transformedMR.authorEmail,
          },
        },
        create: {
          name: transformedMR.authorName,
          email: transformedMR.authorEmail,
          provider: "GITLAB",
          username: transformedMR.authorUsername,
        },
        update: {},
      });

      let assigneeId: string | undefined;
      if (transformedMR.assigneeEmail && transformedMR.assigneeUsername) {
        const assignee = await db.contributor.upsert({
          where: {
            provider_email: {
              provider: "GITLAB",
              email: transformedMR.assigneeEmail,
            },
          },
          create: {
            name: transformedMR.assigneeUsername,
            email: transformedMR.assigneeEmail,
            provider: "GITLAB",
            username: transformedMR.assigneeUsername,
          },
          update: {},
        });
        assigneeId = assignee.id;
      }

      await upsertMergeRequest(db, repoId, transformedMR, author.id, assigneeId);
      successCount++;
    } catch (error) {
      console.error(`Failed to store MR !${mr.iid}:`, error);
    }
  }

  return successCount;
}

async function processProjectMergeRequests(
  gitlab: InstanceType<typeof Gitlab>,
  db: DbClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const project = await gitlab.Projects.show(repo.fullName);
    const mergeRequests = await fetchMergeRequestsForProject(gitlab, project.id, startDate, endDate);
    const count = await storeMergeRequests(db, repo.id, mergeRequests);
    return { count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import merge requests for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

interface GitLabMergeRequest {
  iid: number;
  title: string;
  description?: string | null;
  state: string;
  workInProgress?: boolean;
  draft?: boolean;
  mergedAt?: string | null;
  closedAt?: string | null;
  updatedAt: string;
  author?: { username?: string; name?: string; email?: string | null } | null;
  assignee?: { username: string; name?: string; email?: string | null } | null;
  sourceBranch: string;
  targetBranch: string;
  webUrl: string;
}

interface TransformedMergeRequest {
  number: number;
  title: string;
  description: string | null | undefined;
  state: PullRequestState;
  authorEmail: string;
  authorName: string;
  authorUsername?: string;
  assigneeEmail?: string;
  assigneeUsername?: string;
  sourceBranch: string;
  targetBranch: string;
  url: string;
  mergedAt?: Date | null;
  closedAt?: Date | null;
}
