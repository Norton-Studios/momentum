import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { PrismaClient } from "@prisma/client";

export const contributorScript = {
  dataSourceName: "GITLAB",
  resource: "contributor",
  dependsOn: ["repository"],
  importWindowDays: 365,

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
    let totalContributors = 0;

    for (const repo of repos) {
      const result = await processProjectContributors(gitlab, db, repo, context.runId);
      if (result.error) {
        errors.push(result.error);
      }
      totalContributors += result.count;
    }

    if (errors.length > 0) {
      await logImportErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalContributors },
    });
  },
};

function isValidContributor(contributor: GitLabUser): boolean {
  return Boolean(contributor.username && contributor.id);
}

async function fetchContributorsForProject(gitlab: InstanceType<typeof Gitlab>, projectId: number): Promise<GitLabUser[]> {
  const users = await gitlab.Projects.allUsers(projectId);
  return users as GitLabUser[];
}

async function upsertContributors(db: PrismaClient, contributors: EnrichedContributor[]): Promise<void> {
  await Promise.all(
    contributors.map((contributor) =>
      db.contributor.upsert({
        where: {
          provider_email: {
            provider: "GITLAB",
            email: contributor.email,
          },
        },
        create: {
          name: contributor.name,
          email: contributor.email,
          username: contributor.username,
          provider: "GITLAB",
          providerUserId: contributor.providerUserId,
          avatarUrl: contributor.avatarUrl,
        },
        update: {
          name: contributor.name,
          username: contributor.username,
          providerUserId: contributor.providerUserId,
          avatarUrl: contributor.avatarUrl,
        },
      })
    )
  );
}

async function processProjectContributors(
  gitlab: InstanceType<typeof Gitlab>,
  db: PrismaClient,
  repo: { id: string; fullName: string },
  _runId: string
): Promise<{ count: number; error?: string }> {
  try {
    const projectPath = repo.fullName;
    const project = await gitlab.Projects.show(projectPath);
    const contributors = await fetchContributorsForProject(gitlab, project.id);

    const enrichedContributors = contributors.filter(isValidContributor).map((contributor) => ({
      providerUserId: String(contributor.id),
      username: contributor.username,
      name: contributor.name || contributor.username,
      email: contributor.email || `${contributor.username}@gitlab.com`,
      avatarUrl: contributor.avatarUrl || null,
    }));

    await upsertContributors(db, enrichedContributors);
    return { count: enrichedContributors.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import contributors for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

async function logImportErrors(db: PrismaClient, runId: string, errors: string[]): Promise<void> {
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

interface GitLabUser {
  id: number;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface EnrichedContributor {
  providerUserId: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}
