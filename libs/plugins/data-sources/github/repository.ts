import type { PrismaClient } from "@mmtm/database";
import { Octokit } from "@octokit/rest";

export const resources: string[] = ["repository"];

// Optional: specify import window duration (defaults to 24 hours)
export const importWindowDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

export const run = async (env: Record<string, string>, db: PrismaClient, tenantId: string, startDate: Date, endDate: Date) => {
  console.log(`Importing repositories from GitHub for tenant ${tenantId}...`);
  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Validate required environment variables
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required in tenant configuration");
  }

  const octokit = new Octokit({
    auth: env.GITHUB_TOKEN,
  });

  // If GITHUB_ORG is provided, fetch org repos, otherwise fetch user repos
  let repos: any[] = [];

  if (env.GITHUB_ORG) {
    console.log(`Fetching repositories for organization: ${env.GITHUB_ORG}`);
    const { data } = await octokit.repos.listForOrg({
      org: env.GITHUB_ORG,
      per_page: 100,
      type: "all",
    });
    repos = data;
  } else {
    console.log("Fetching repositories for authenticated user");
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      type: "all",
    });
    repos = data;
  }

  // Filter repos by date range if they have been updated within the range
  const filteredRepos = repos.filter((repo) => {
    if (!repo.updated_at) return false;
    const updatedAt = new Date(repo.updated_at);
    return updatedAt >= startDate && updatedAt <= endDate;
  });

  console.log(`Found ${filteredRepos.length} repositories updated between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  for (const repo of filteredRepos) {
    if (!repo.owner) continue;

    const data = {
      name: repo.name,
      description: repo.description,
      owner: repo.owner.login,
      url: repo.html_url,
      language: repo.language,
      isPrivate: repo.private,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      issues: repo.open_issues_count ?? 0,
      externalId: repo.id.toString(),
      tenantId,
      createdAt: repo.created_at ? new Date(repo.created_at) : new Date(),
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    };

    await db.repository.upsert({
      where: {
        tenantId_externalId: {
          tenantId,
          externalId: data.externalId,
        },
      },
      update: data,
      create: data,
    });
  }

  console.log(`Imported/updated ${filteredRepos.length} repositories for tenant ${tenantId}.`);
};
