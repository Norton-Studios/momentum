import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { PrismaClient } from "@prisma/client";

export const repositoryScript = {
  dataSourceName: "GITHUB",
  resource: "repository",
  dependsOn: [],
  importWindowDays: 365,

  async run(context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });
    const repos = await fetchAllRepositories(octokit, context.env.GITHUB_ORG);
    await upsertRepositories(context.db, repos, context.runId, context.dataSourceId);
  },
};

async function fetchAllRepositories(octokit: Octokit, org: string) {
  const allRepos = [];
  for await (const response of octokit.paginate.iterator(octokit.repos.listForOrg, { org, per_page: 100 })) {
    allRepos.push(...response.data);
  }
  return allRepos;
}

async function upsertRepositories(db: PrismaClient, repos: Awaited<ReturnType<typeof fetchAllRepositories>>, runId: string, dataSourceId: string) {
  await Promise.all(
    repos.map((repo) =>
      db.repository.upsert({
        where: { fullName: repo.full_name },
        create: {
          dataSourceId,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          provider: "GITHUB",
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          isPrivate: repo.private,
          isEnabled: true,
          lastSyncAt: new Date(),
        },
        update: {
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          lastSyncAt: new Date(),
        },
      })
    )
  );

  await db.dataSourceRun.update({
    where: { id: runId },
    data: { recordsImported: repos.length },
  });
}
