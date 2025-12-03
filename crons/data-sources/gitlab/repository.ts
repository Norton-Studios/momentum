import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { PrismaClient } from "@prisma/client";

export const repositoryScript = {
  dataSourceName: "GITLAB",
  resource: "repository",
  dependsOn: [],
  importWindowDays: 365,

  async run(db: PrismaClient, context: ExecutionContext) {
    const gitlab = new Gitlab({ token: context.env.GITLAB_TOKEN, host: context.env.GITLAB_HOST || "https://gitlab.com" });
    const repos = await fetchAllProjects(gitlab, context.env.GITLAB_GROUP);
    await upsertRepositories(db, repos, context.runId, context.id);
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

async function upsertRepositories(db: PrismaClient, repos: GitLabProject[], runId: string, dataSourceId: string) {
  await Promise.all(
    repos.map((repo) =>
      db.repository.upsert({
        where: { fullName: repo.pathWithNamespace },
        create: {
          dataSourceId,
          name: repo.name,
          fullName: repo.pathWithNamespace,
          description: repo.description ?? null,
          provider: "GITLAB",
          url: repo.webUrl,
          language: null,
          stars: repo.starCount ?? 0,
          forks: repo.forksCount ?? 0,
          isPrivate: repo.visibility !== "public",
          isArchived: repo.archived ?? false,
          isEnabled: true,
          lastSyncAt: new Date(),
        },
        update: {
          description: repo.description ?? null,
          stars: repo.starCount ?? 0,
          forks: repo.forksCount ?? 0,
          isArchived: repo.archived ?? false,
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

interface GitLabProject {
  id: number;
  name: string;
  pathWithNamespace: string;
  description?: string | null;
  webUrl: string;
  visibility: string;
  starCount?: number;
  forksCount?: number;
  archived?: boolean;
}
