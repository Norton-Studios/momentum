import { Gitlab } from "@gitbeaker/rest";
import { Octokit } from "@octokit/rest";
import type { PrismaClient } from "@prisma/client";

interface FetchRepositoriesParams {
  token: string;
  organization?: string;
  host?: string;
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
  if (!organization) {
    throw new Error("Organization is required for GitHub");
  }
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

export async function fetchGitlabRepositories({ token, host = "https://gitlab.com" }: FetchRepositoriesParams): Promise<RepositoryData[]> {
  const gitlab = new Gitlab({ token, host });
  const allRepos: RepositoryData[] = [];

  const projects = await gitlab.Projects.all({
    membership: true,
    perPage: 100,
    maxPages: 100,
  });

  for (const project of projects) {
    // Skip projects without required fields
    const fullName = project.path_with_namespace ?? project.path;
    if (!fullName) {
      console.warn(`[GitLab] Skipping project ${project.id} - missing path_with_namespace`);
      continue;
    }

    allRepos.push({
      name: project.name ?? fullName.split("/").pop() ?? String(project.id),
      fullName,
      description: project.description || null,
      url: project.web_url ?? `${host}/${fullName}`,
      language: null,
      stars: project.star_count ?? 0,
      forks: project.forks_count ?? 0,
      isPrivate: project.visibility !== "public",
      isArchived: project.archived ?? false,
      pushedAt: project.last_activity_at ? new Date(project.last_activity_at) : null,
    });
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
          isArchived: repo.isArchived,
          isEnabled: !repo.isArchived,
          lastSyncAt: repo.pushedAt,
        },
        update: {
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          isArchived: repo.isArchived,
          lastSyncAt: repo.pushedAt,
        },
      })
    )
  );
}
