import type { DbClient } from "~/db.server.ts";
import { fetchGithubRepositories, fetchGitlabRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { DEFAULT_ACTIVE_THRESHOLD_DAYS } from "~/lib/repositories/toggle-repositories";

interface DataSourceWithConfigs {
  id: string;
  provider: string;
  configs: Array<{ key: string; value: string }>;
}

export async function initializeRepositories(db: DbClient, dataSource: DataSourceWithConfigs, provider: string) {
  if (provider === "github") {
    const token = dataSource.configs.find((c) => c.key === "GITHUB_TOKEN")?.value;
    const org = dataSource.configs.find((c) => c.key === "GITHUB_ORG")?.value;

    if (!token || !org) {
      throw new Error("GitHub token or organization not configured");
    }

    const repositories = await fetchGithubRepositories({ token, organization: org });
    await saveRepositories(db, dataSource.id, repositories, "GITHUB");
    await setDefaultSelections(db, dataSource.id);
  } else if (provider === "gitlab") {
    const token = dataSource.configs.find((c) => c.key === "GITLAB_TOKEN")?.value;
    const host = dataSource.configs.find((c) => c.key === "GITLAB_HOST")?.value;

    if (!token) {
      throw new Error("GitLab token not configured");
    }

    const repositories = await fetchGitlabRepositories({ token, host });
    await saveRepositories(db, dataSource.id, repositories, "GITLAB");
    await setDefaultSelections(db, dataSource.id);
  }
}

export async function setDefaultSelections(db: DbClient, dataSourceId: string) {
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - DEFAULT_ACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  await db.repository.updateMany({
    where: {
      dataSourceId,
      lastSyncAt: { gte: thresholdDate },
    },
    data: { isEnabled: true },
  });

  await db.repository.updateMany({
    where: {
      dataSourceId,
      OR: [{ lastSyncAt: { lt: thresholdDate } }, { lastSyncAt: null }],
    },
    data: { isEnabled: false },
  });
}
