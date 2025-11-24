import { Octokit } from "@octokit/rest";
import type { PrismaClient } from "@prisma/client";

interface FetchRepositoriesParams {
  token: string;
  organization: string;
}

interface RepositoryData {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  isPrivate: boolean;
  isArchived: boolean;
  pushedAt: Date | null;
}

export async function fetchGithubRepositories({ token, organization }: FetchRepositoriesParams): Promise<RepositoryData[]> {
  const octokit = new Octokit({ auth: token });
  const allRepos: RepositoryData[] = [];

  for await (const response of octokit.paginate.iterator(octokit.repos.listForOrg, {
    org: organization,
    per_page: 100,
  })) {
    const repos = response.data.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      language: repo.language || null,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      isPrivate: repo.private,
      isArchived: repo.archived || false,
      pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    }));
    allRepos.push(...repos);
  }

  return allRepos;
}

export async function saveRepositories(
  db: PrismaClient,
  dataSourceId: string,
  repositories: RepositoryData[],
  provider: "GITHUB" | "GITLAB" | "BITBUCKET" = "GITHUB"
): Promise<void> {
  await Promise.all(
    repositories.map((repo) =>
      db.repository.upsert({
        where: { fullName: repo.fullName },
        create: {
          dataSourceId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          provider,
          url: repo.url,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          isPrivate: repo.isPrivate,
          isEnabled: !repo.isArchived,
          lastSyncAt: new Date(),
        },
        update: {
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          lastSyncAt: new Date(),
        },
      })
    )
  );
}
