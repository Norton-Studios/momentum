import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { DbClient } from "~/db.server.js";
import type { ReviewState } from "../../db.ts";

export const pullRequestReviewScript = {
  dataSourceName: "GITHUB",
  resource: "pull-request-review",
  dependsOn: ["pull-request", "contributor"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    const pullRequests = await db.pullRequest.findMany({
      where: {
        repository: {
          provider: "GITHUB",
          dataSourceId: context.id,
          isEnabled: true,
        },
        updatedAt: { gte: context.startDate, lte: context.endDate },
      },
      select: {
        id: true,
        number: true,
        repository: { select: { fullName: true } },
      },
    });

    const errors: string[] = [];
    let totalReviews = 0;

    for (const pr of pullRequests) {
      const result = await processPullRequestReviews(octokit, db, pr);
      if (result.error) {
        errors.push(result.error);
      }
      totalReviews += result.count;
    }

    if (errors.length > 0) {
      await logReviewErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalReviews },
    });
  },
};

function mapGitHubStateToReviewState(state: string): ReviewState | null {
  const stateMap: Record<string, ReviewState> = {
    APPROVED: "APPROVED",
    CHANGES_REQUESTED: "CHANGES_REQUESTED",
    COMMENTED: "COMMENTED",
    DISMISSED: "DISMISSED",
  };
  return stateMap[state] ?? null;
}

async function fetchReviewsForPullRequest(octokit: Octokit, owner: string, repoName: string, prNumber: number): Promise<GitHubReview[]> {
  const allReviews: GitHubReview[] = [];

  for await (const response of octokit.paginate.iterator(octokit.pulls.listReviews, {
    owner,
    repo: repoName,
    pull_number: prNumber,
    per_page: 100,
  })) {
    allReviews.push(...response.data);
  }

  return allReviews;
}

async function ensureReviewerExists(db: DbClient, email: string, name: string, username?: string): Promise<string> {
  const reviewer = await db.contributor.upsert({
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
  return reviewer.id;
}

async function upsertReview(db: DbClient, pullRequestId: string, review: GitHubReview, reviewerId: string, state: ReviewState): Promise<void> {
  await db.pullRequestReview.upsert({
    where: {
      id: `github-${review.id}`,
    },
    create: {
      id: `github-${review.id}`,
      pullRequestId,
      reviewerId,
      state,
      body: review.body ?? null,
      commentsCount: 0,
      submittedAt: new Date(review.submitted_at),
    },
    update: {
      state,
      body: review.body ?? null,
    },
  });
}

async function storeReviews(db: DbClient, pullRequestId: string, reviews: GitHubReview[]): Promise<number> {
  let successCount = 0;

  for (const review of reviews) {
    try {
      const state = mapGitHubStateToReviewState(review.state);
      if (!state) continue;

      if (!review.user || !review.submitted_at) continue;

      const email = review.user.email || `${review.user.login}@github.com`;
      const reviewerId = await ensureReviewerExists(db, email, review.user.login, review.user.login);

      await upsertReview(db, pullRequestId, review, reviewerId, state);
      successCount++;
    } catch (error) {
      console.error(`Failed to store review ${review.id}:`, error);
    }
  }

  return successCount;
}

async function processPullRequestReviews(
  octokit: Octokit,
  db: DbClient,
  pr: { id: string; number: number; repository: { fullName: string } }
): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = pr.repository.fullName.split("/");
    const reviews = await fetchReviewsForPullRequest(octokit, owner, repoName, pr.number);
    const count = await storeReviews(db, pr.id, reviews);
    return { count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import reviews for PR #${pr.number} in ${pr.repository.fullName}: ${errorMessage}`,
    };
  }
}

async function logReviewErrors(db: DbClient, runId: string, errors: string[]): Promise<void> {
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

interface GitHubReview {
  id: number;
  user?: { login: string; email?: string | null } | null;
  body?: string | null;
  state: string;
  submitted_at: string;
}
