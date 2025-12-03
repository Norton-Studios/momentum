import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { PrismaClient } from "@prisma/client";

export const commitScript = {
  dataSourceName: "GITLAB",
  resource: "commit",
  dependsOn: ["repository", "contributor"],
  importWindowDays: 90,

  async run(db: PrismaClient, context: ExecutionContext) {
    const gitlab = new Gitlab({ token: context.env.GITLAB_TOKEN, host: context.env.GITLAB_HOST || "https://gitlab.com" });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITLAB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalCommits = 0;

    for (const repo of repos) {
      const result = await processProjectCommits(gitlab, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalCommits += result.count;
    }

    if (errors.length > 0) {
      await logCommitErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalCommits },
    });
  },
};

function hasAuthorInfo(commit: GitLabCommit): boolean {
  return Boolean(commit.authorEmail && commit.authorName && commit.committedDate);
}

function transformCommit(commit: GitLabCommit): TransformedCommit | null {
  if (!hasAuthorInfo(commit)) {
    return null;
  }

  return {
    sha: commit.id,
    message: commit.message ?? "",
    authorEmail: commit.authorEmail!,
    authorName: commit.authorName!,
    committedAt: new Date(commit.committedDate!),
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
  };
}

async function fetchCommitsForProject(gitlab: InstanceType<typeof Gitlab>, projectId: number, startDate: Date, endDate: Date): Promise<GitLabCommit[]> {
  const commits = await gitlab.Commits.all(projectId, {
    since: startDate.toISOString(),
    until: endDate.toISOString(),
    perPage: 100,
  });
  return commits as GitLabCommit[];
}

async function ensureContributorExists(db: PrismaClient, email: string, name: string): Promise<string> {
  const contributor = await db.contributor.upsert({
    where: {
      provider_email: {
        provider: "GITLAB",
        email,
      },
    },
    create: {
      name,
      email,
      provider: "GITLAB",
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

async function processProjectCommits(
  gitlab: InstanceType<typeof Gitlab>,
  db: PrismaClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const project = await gitlab.Projects.show(repo.fullName);
    const commits = await fetchCommitsForProject(gitlab, project.id, startDate, endDate);

    const transformedCommits = commits.map(transformCommit).filter((c): c is TransformedCommit => c !== null);

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

interface GitLabCommit {
  id: string;
  message?: string;
  authorEmail?: string;
  authorName?: string;
  committedDate?: string;
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
