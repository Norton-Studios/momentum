import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { PullRequestState } from "@prisma/client";
import type { DbClient } from "~/db.server.js";

export const pullRequestScript = {
  dataSourceName: "GITHUB",
  resource: "pull-request",
  dependsOn: ["repository", "contributor"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITHUB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalPullRequests = 0;

    for (const repo of repos) {
      const result = await processRepositoryPullRequests(octokit, db, repo, context.startDate, context.endDate, context.runId);
      if (result.error) {
        errors.push(result.error);
      }
      totalPullRequests += result.count;
    }

    if (errors.length > 0) {
      await logPullRequestErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalPullRequests },
    });
  },
};

function mapGitHubStateToPullRequestState(state: string, draft: boolean, mergedAt: string | null | undefined): PullRequestState {
  if (draft) return "DRAFT";
  if (state === "closed" && mergedAt) return "MERGED";
  if (state === "closed") return "CLOSED";
  return "OPEN";
}

function isWithinDateRange(updatedAt: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(updatedAt);
  return date >= startDate && date <= endDate;
}

function shouldStopPaginating(oldestPR: GitHubPullRequest, startDate: Date): boolean {
  return new Date(oldestPR.updated_at) < startDate;
}

async function fetchPullRequestsForRepository(octokit: Octokit, owner: string, repoName: string, startDate: Date, endDate: Date): Promise<GitHubPullRequest[]> {
  const allPullRequests: GitHubPullRequest[] = [];

  for await (const response of octokit.paginate.iterator(octokit.pulls.list, {
    owner,
    repo: repoName,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  })) {
    const filteredPRs = response.data.filter((pr) => isWithinDateRange(pr.updated_at, startDate, endDate));
    allPullRequests.push(...filteredPRs);

    const oldestPR = response.data[response.data.length - 1];
    if (oldestPR && shouldStopPaginating(oldestPR, startDate)) {
      break;
    }
  }

  return allPullRequests;
}

function transformPullRequest(pr: GitHubPullRequest): TransformedPullRequest {
  return {
    number: pr.number,
    title: pr.title,
    description: pr.body,
    state: mapGitHubStateToPullRequestState(pr.state, pr.draft ?? false, pr.merged_at),
    authorEmail: pr.user?.email || `${pr.user?.login}@github.com`,
    authorName: pr.user?.login || "unknown",
    assigneeEmail: pr.assignee ? pr.assignee.email || `${pr.assignee.login}@github.com` : undefined,
    assigneeLogin: pr.assignee?.login,
    sourceBranch: pr.head.ref,
    targetBranch: pr.base.ref,
    url: pr.html_url,
    createdAt: new Date(pr.created_at),
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
    closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
  };
}

async function ensureAuthorExists(db: DbClient, email: string, name: string, username?: string): Promise<string> {
  const author = await db.contributor.upsert({
    where: {
      provider_email: {
        provider: "GITHUB",
        email,
      },
    },
    create: {
      name,
      email,
      provider: "GITHUB",
      username,
    },
    update: {},
  });
  return author.id;
}

async function ensureAssigneeExists(db: DbClient, email: string, name: string, username: string): Promise<string> {
  const assignee = await db.contributor.upsert({
    where: {
      provider_email: {
        provider: "GITHUB",
        email,
      },
    },
    create: {
      name,
      email,
      provider: "GITHUB",
      username,
    },
    update: {},
  });
  return assignee.id;
}

async function upsertPullRequest(db: DbClient, repoId: string, transformedPR: TransformedPullRequest, authorId: string, assigneeId?: string): Promise<void> {
  await db.pullRequest.upsert({
    where: {
      repositoryId_number: {
        repositoryId: repoId,
        number: transformedPR.number,
      },
    },
    create: {
      number: transformedPR.number,
      title: transformedPR.title,
      description: transformedPR.description,
      state: transformedPR.state,
      authorId,
      assigneeId,
      repositoryId: repoId,
      sourceBranch: transformedPR.sourceBranch,
      targetBranch: transformedPR.targetBranch,
      url: transformedPR.url,
      linesAdded: 0, // Would need separate API call
      linesRemoved: 0,
      filesChanged: 0,
      commitsCount: 0,
      createdAt: transformedPR.createdAt,
      mergedAt: transformedPR.mergedAt,
      closedAt: transformedPR.closedAt,
    },
    update: {
      title: transformedPR.title,
      description: transformedPR.description,
      state: transformedPR.state,
      assigneeId,
      linesAdded: 0,
      linesRemoved: 0,
      filesChanged: 0,
      commitsCount: 0,
      createdAt: transformedPR.createdAt,
      mergedAt: transformedPR.mergedAt,
      closedAt: transformedPR.closedAt,
    },
  });
}

async function storePullRequests(db: DbClient, repoId: string, prs: GitHubPullRequest[]): Promise<number> {
  let successCount = 0;

  for (const pr of prs) {
    try {
      const transformedPR = transformPullRequest(pr);
      const authorId = await ensureAuthorExists(db, transformedPR.authorEmail, transformedPR.authorName, pr.user?.login);

      let assigneeId: string | undefined;
      if (transformedPR.assigneeEmail && transformedPR.assigneeLogin) {
        assigneeId = await ensureAssigneeExists(db, transformedPR.assigneeEmail, transformedPR.assigneeLogin, transformedPR.assigneeLogin);
      }

      await upsertPullRequest(db, repoId, transformedPR, authorId, assigneeId);
      successCount++;
    } catch (error) {
      console.error(`Failed to store PR #${pr.number}:`, error);
    }
  }

  return successCount;
}

async function processRepositoryPullRequests(
  octokit: Octokit,
  db: DbClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date,
  _runId: string
): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = repo.fullName.split("/");
    const pullRequests = await fetchPullRequestsForRepository(octokit, owner, repoName, startDate, endDate);
    const count = await storePullRequests(db, repo.id, pullRequests);
    return { count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import pull requests for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

async function logPullRequestErrors(db: DbClient, runId: string, errors: string[]): Promise<void> {
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

interface GitHubPullRequest {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  draft?: boolean;
  created_at: string;
  merged_at?: string | null;
  closed_at?: string | null;
  updated_at: string;
  user?: { login?: string; email?: string | null } | null;
  assignee?: { login: string; email?: string | null } | null;
  head: { ref: string };
  base: { ref: string };
  html_url: string;
}

interface TransformedPullRequest {
  number: number;
  title: string;
  description: string | null | undefined;
  state: PullRequestState;
  authorEmail: string;
  authorName: string;
  assigneeEmail?: string;
  assigneeLogin?: string;
  sourceBranch: string;
  targetBranch: string;
  url: string;
  createdAt: Date;
  mergedAt?: Date | null;
  closedAt?: Date | null;
}
