import type { PrismaClient } from "@mmtm/database";
import { Octokit } from "@octokit/rest";

export interface DiscoveredRepository {
  externalId: string;
  name: string;
  description?: string | null;
  owner: string;
  url: string;
  language?: string | null;
  isPrivate: boolean;
  stars: number;
  forks: number;
  issues: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryDiscoveryResult {
  repositories: DiscoveredRepository[];
  dataSource: string;
  totalCount: number;
}

/**
 * Discover repositories from configured data sources
 */
export async function discoverRepositories(tenantId: string, db: PrismaClient): Promise<RepositoryDiscoveryResult[]> {
  const results: RepositoryDiscoveryResult[] = [];

  // Get data source configurations for this tenant
  const configs = await db.tenantDataSourceConfig.findMany({
    where: {
      tenantId,
      dataSource: "github", // For now, only support GitHub
    },
  });

  for (const config of configs) {
    if (config.dataSource === "github") {
      try {
        const githubResult = await discoverGitHubRepositories(config.value); // token
        results.push(githubResult);
      } catch (error) {
        console.error(`Failed to discover GitHub repositories:`, error);
        // Continue with other data sources
      }
    }
  }

  return results;
}

/**
 * Discover repositories from GitHub using the provided token
 */
async function discoverGitHubRepositories(token: string): Promise<RepositoryDiscoveryResult> {
  const octokit = new Octokit({ auth: token });

  // Get user's repositories
  const { data: repos } = await octokit.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "updated",
    direction: "desc",
  });

  const repositories: DiscoveredRepository[] = repos
    .filter((repo) => repo.owner) // Ensure owner exists
    .map((repo) => ({
      externalId: repo.id.toString(),
      name: repo.name,
      description: repo.description,
      owner: repo.owner!.login,
      url: repo.html_url,
      language: repo.language,
      isPrivate: repo.private,
      stars: repo.stargazers_count ?? 0,
      forks: repo.forks_count ?? 0,
      issues: repo.open_issues_count ?? 0,
      createdAt: repo.created_at ? new Date(repo.created_at) : new Date(),
      updatedAt: repo.updated_at ? new Date(repo.updated_at) : new Date(),
    }));

  return {
    repositories,
    dataSource: "github",
    totalCount: repositories.length,
  };
}

/**
 * Get repositories currently tracked for a tenant
 */
export async function getRepositoriesForTenant(tenantId: string, db: PrismaClient) {
  return await db.repository.findMany({
    where: { tenantId },
    orderBy: [{ updatedAt: "desc" }],
  });
}

/**
 * Add a repository to track for a tenant
 */
export async function addRepositoryToTenant(tenantId: string, repository: DiscoveredRepository, db: PrismaClient) {
  return await db.repository.upsert({
    where: { externalId: repository.externalId },
    update: {
      ...repository,
      tenantId,
    },
    create: {
      ...repository,
      tenantId,
    },
  });
}

/**
 * Remove a repository from tenant tracking
 */
export async function removeRepositoryFromTenant(tenantId: string, repositoryId: number, db: PrismaClient) {
  return await db.repository.delete({
    where: {
      id: repositoryId,
      tenantId, // Ensure the repository belongs to this tenant
    },
  });
}
