import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { DbClient } from "~/db.server.js";

export const repositoryScript = {
  dataSourceName: "GITLAB",
  resource: "repository",
  dependsOn: [],
  importWindowDays: 365,

  async run(db: DbClient, context: ExecutionContext) {
    const host = context.env.GITLAB_HOST || "https://gitlab.com";
    const gitlab = new Gitlab({ token: context.env.GITLAB_TOKEN, host });
    const repos = await fetchAllProjects(gitlab, context.env.GITLAB_GROUP);
    await upsertRepositories(db, repos, context.runId, context.id, host);
  },
};

async function fetchAllProjects(gitlab: InstanceType<typeof Gitlab>, group?: string): Promise<GitLabProject[]> {
  if (group) {
    const projects = await gitlab.Groups.allProjects(group, { perPage: 100, includeSubgroups: true });
    return projects as GitLabProject[];
  }
  const projects = await gitlab.Projects.all({ perPage: 100, membership: true });
  return projects as GitLabProject[];
}

async function upsertRepositories(db: DbClient, repos: GitLabProject[], runId: string, dataSourceId: string, host: string) {
  const validRepos = repos.filter((repo) => {
    const fullName = repo.pathWithNamespace ?? repo.path_with_namespace ?? repo.path;
    if (!fullName) {
      console.warn(`[GitLab] Skipping project ${repo.id} - missing path_with_namespace`);
      return false;
    }
    return true;
  });

  await Promise.all(
    validRepos.map((repo) => {
      const fullName = repo.pathWithNamespace ?? repo.path_with_namespace ?? repo.path;
      const url = repo.webUrl ?? repo.web_url ?? `${host}/${fullName}`;
      return db.repository.upsert({
        where: { fullName },
        create: {
          dataSourceId,
          name: repo.name ?? fullName.split("/").pop() ?? String(repo.id),
          fullName,
          description: repo.description ?? null,
          provider: "GITLAB",
          url,
          language: null,
          stars: repo.starCount ?? repo.star_count ?? 0,
          forks: repo.forksCount ?? repo.forks_count ?? 0,
          isPrivate: repo.visibility !== "public",
          isArchived: repo.archived ?? false,
          isEnabled: true,
          lastSyncAt: new Date(),
        },
        update: {
          description: repo.description ?? null,
          stars: repo.starCount ?? repo.star_count ?? 0,
          forks: repo.forksCount ?? repo.forks_count ?? 0,
          isArchived: repo.archived ?? false,
          lastSyncAt: new Date(),
        },
      });
    })
  );

  await db.dataSourceRun.update({
    where: { id: runId },
    data: { recordsImported: validRepos.length },
  });
}

interface GitLabProject {
  id: number;
  name: string;
  // GitLab API returns snake_case, gitbeaker may or may not convert to camelCase
  pathWithNamespace?: string;
  path_with_namespace?: string;
  path?: string;
  description?: string | null;
  webUrl?: string;
  web_url?: string;
  visibility: string;
  starCount?: number;
  star_count?: number;
  forksCount?: number;
  forks_count?: number;
  archived?: boolean;
}
