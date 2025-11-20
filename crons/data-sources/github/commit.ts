import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { PrismaClient } from "@prisma/client";

function hasAuthorInfo(commit: GitHubCommit): boolean {
  return Boolean(commit.commit.author?.email && commit.commit.author?.name && commit.commit.author?.date);
}

function transformCommit(commit: GitHubCommit): TransformedCommit | null {
  if (!hasAuthorInfo(commit)) {
    return null;
  }

  const author = commit.commit.author!;

  return {
    sha: commit.sha,
    message: commit.commit.message,
    authorEmail: author.email!,
    authorName: author.name!,
    committedAt: new Date(author.date!),
    linesAdded: commit.stats?.additions || 0,
    linesRemoved: commit.stats?.deletions || 0,
    filesChanged: commit.files?.length || 0,
  };
}

async function fetchCommitsForRepository(octokit: Octokit, owner: string, repoName: string, startDate: Date, endDate: Date): Promise<GitHubCommit[]> {
  const allCommits: GitHubCommit[] = [];

  for await (const response of octokit.paginate.iterator(octokit.repos.listCommits, {
    owner,
    repo: repoName,
    since: startDate.toISOString(),
    until: endDate.toISOString(),
    per_page: 100,
  })) {
    allCommits.push(...response.data);
  }

  return allCommits;
}

async function ensureContributorExists(db: PrismaClient, email: string, name: string): Promise<string> {
  const contributor = await db.contributor.upsert({
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
    },
    update: {},
  });

  return contributor.id;
}

async function upsertCommit(db: PrismaClient, repoId: string, transformedCommit: TransformedCommit, authorId: string): Promise<void> {
  await db.commit.upsert({
    where: {
      repositoryId_sha: {
        repositoryId: repoId,
        sha: transformedCommit.sha,
      },
    },
    create: {
      sha: transformedCommit.sha,
      message: transformedCommit.message,
      authorId,
      committedAt: transformedCommit.committedAt,
      repositoryId: repoId,
      linesAdded: transformedCommit.linesAdded,
      linesRemoved: transformedCommit.linesRemoved,
      filesChanged: transformedCommit.filesChanged,
    },
    update: {
      message: transformedCommit.message,
      linesAdded: transformedCommit.linesAdded,
      linesRemoved: transformedCommit.linesRemoved,
      filesChanged: transformedCommit.filesChanged,
    },
  });
}

async function storeCommits(db: PrismaClient, repoId: string, transformedCommits: TransformedCommit[]): Promise<number> {
  let successCount = 0;

  for (const commit of transformedCommits) {
    try {
      const authorId = await ensureContributorExists(db, commit.authorEmail, commit.authorName);
      await upsertCommit(db, repoId, commit, authorId);
      successCount++;
    } catch (error) {
      console.error(`Failed to store commit ${commit.sha}:`, error);
    }
  }

  return successCount;
}

async function processRepositoryCommits(
  octokit: Octokit,
  db: PrismaClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = repo.fullName.split("/");
    const commits = await fetchCommitsForRepository(octokit, owner, repoName, startDate, endDate);

    const transformedCommits = commits.map(transformCommit).filter((c) => c !== null) as TransformedCommit[];

    const count = await storeCommits(db, repo.id, transformedCommits);
    return { count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import commits for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

async function logCommitErrors(db: PrismaClient, runId: string, errors: string[]): Promise<void> {
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

export const commitScript = {
  dataSourceName: "GITHUB",
  resource: "commit",
  dependsOn: ["repository", "contributor"],
  importWindowDays: 90,

  async run(context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    const repos = await context.db.repository.findMany({
      where: { provider: "GITHUB" },
    });

    const errors: string[] = [];
    let totalCommits = 0;

    for (const repo of repos) {
      const result = await processRepositoryCommits(octokit, context.db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalCommits += result.count;
    }

    if (errors.length > 0) {
      await logCommitErrors(context.db, context.runId, errors);
    }

    await context.db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalCommits },
    });
  },
};

interface GitHubCommit {
  sha: string;
  commit: {
    author?: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
    message: string;
  };
  stats?: {
    additions?: number;
    deletions?: number;
  };
  files?: unknown[];
}

interface TransformedCommit {
  sha: string;
  message: string;
  authorEmail: string;
  authorName: string;
  committedAt: Date;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
}
