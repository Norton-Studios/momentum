import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { DbClient } from "~/db.server.js";

export const contributorScript = {
  dataSourceName: "GITHUB",
  resource: "contributor",
  dependsOn: ["repository"],
  importWindowDays: 365,

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
    let totalContributors = 0;

    for (const repo of repos) {
      const result = await processRepositoryContributors(octokit, db, repo, context.runId);
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

function isValidContributor(contributor: GitHubContributor): boolean {
  return Boolean(contributor.login && contributor.id && contributor.avatar_url);
}

async function fetchContributorFromGitHub(octokit: Octokit, login: string): Promise<{ name?: string | null; email?: string | null }> {
  try {
    const { data: user } = await octokit.users.getByUsername({ username: login });
    return { name: user.name, email: user.email };
  } catch {
    return {};
  }
}

async function enrichContributor(octokit: Octokit, contributor: GitHubContributor): Promise<EnrichedContributor | null> {
  if (!isValidContributor(contributor)) {
    return null;
  }

  if (!contributor.login || !contributor.id || !contributor.avatar_url) {
    return null;
  }

  const userDetails = await fetchContributorFromGitHub(octokit, contributor.login);

  return {
    providerUserId: String(contributor.id),
    username: contributor.login,
    name: userDetails.name || contributor.login,
    email: userDetails.email || `${contributor.login}@github.com`,
    avatarUrl: contributor.avatar_url,
  };
}

async function fetchContributorsForRepository(octokit: Octokit, owner: string, repoName: string): Promise<GitHubContributor[]> {
  const allContributors: GitHubContributor[] = [];

  for await (const response of octokit.paginate.iterator(octokit.repos.listContributors, {
    owner,
    repo: repoName,
    per_page: 100,
  })) {
    allContributors.push(...response.data);
  }

  return allContributors;
}

async function enrichAllContributors(octokit: Octokit, contributors: GitHubContributor[]): Promise<EnrichedContributor[]> {
  const enrichedResults = await Promise.all(contributors.map((contributor) => enrichContributor(octokit, contributor)));

  return enrichedResults.filter((c) => c !== null) as EnrichedContributor[];
}

async function upsertContributors(db: DbClient, contributors: EnrichedContributor[]): Promise<void> {
  await Promise.all(
    contributors.map((contributor) =>
      db.contributor.upsert({
        where: {
          provider_email: {
            provider: "GITHUB",
            email: contributor.email,
          },
        },
        create: {
          name: contributor.name,
          email: contributor.email,
          username: contributor.username,
          provider: "GITHUB",
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

async function processRepositoryContributors(octokit: Octokit, db: DbClient, repo: { id: string; fullName: string }, _runId: string): Promise<{ count: number; error?: string }> {
  try {
    const [owner, repoName] = repo.fullName.split("/");
    const contributors = await fetchContributorsForRepository(octokit, owner, repoName);
    const enrichedContributors = await enrichAllContributors(octokit, contributors);
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

async function logImportErrors(db: DbClient, runId: string, errors: string[]): Promise<void> {
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

interface GitHubContributor {
  login?: string;
  id?: number;
  avatar_url?: string;
  [key: string]: unknown;
}

interface EnrichedContributor {
  providerUserId: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
}
