import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { DbClient } from "~/db.server.js";

export const commitScript = {
  dataSourceName: "GITLAB",
  resource: "commit",
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
    let totalCommits = 0;

    for (const repo of repos) {
      const result = await processProjectCommits(gitlab, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalCommits += result.count;
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
      data: { recordsImported: totalCommits },
    });
  },
};

function transformCommit(commit: GitLabCommit): TransformedCommit | null {
  const { authorEmail, authorName, committedDate } = commit;
  if (!authorEmail || !authorName || !committedDate) {
    return null;
  }

  return {
    sha: commit.id,
    message: commit.message ?? "",
    authorEmail,
    authorName,
    committedAt: new Date(committedDate),
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

async function upsertCommit(db: DbClient, repoId: string, transformedCommit: TransformedCommit, authorId: string): Promise<void> {
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

async function storeCommits(db: DbClient, repoId: string, transformedCommits: TransformedCommit[]): Promise<number> {
  let successCount = 0;

  for (const commit of transformedCommits) {
    try {
      const contributor = await db.contributor.upsert({
        where: {
          provider_email: {
            provider: "GITLAB",
            email: commit.authorEmail,
          },
        },
        create: {
          name: commit.authorName,
          email: commit.authorEmail,
          provider: "GITLAB",
        },
        update: {},
      });
      await upsertCommit(db, repoId, commit, contributor.id);
      successCount++;
    } catch (error) {
      console.error(`Failed to store commit ${commit.sha}:`, error);
    }
  }

  return successCount;
}

async function processProjectCommits(
  gitlab: InstanceType<typeof Gitlab>,
  db: DbClient,
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
