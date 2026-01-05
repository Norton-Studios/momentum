import type { JiraProject } from "@crons/data-sources/jira/client.js";
import type { DbClient } from "~/db.server.ts";

const BATCH_SIZE = 10;

interface DataSourceWithConfigs {
  id: string;
  provider: string;
  configs: Array<{ key: string; value: string }>;
}

export async function initializeProjects(db: DbClient, dataSource: DataSourceWithConfigs, provider: string) {
  if (provider === "jira") {
    const configMap: Record<string, string> = {};
    for (const config of dataSource.configs) {
      configMap[config.key] = config.value;
    }

    const projects = await fetchJiraProjects(configMap);
    await saveJiraProjects(db, dataSource.id, projects);
  }
}

export async function fetchJiraProjects(configs: Record<string, string>): Promise<JiraProject[]> {
  const variant = configs.JIRA_VARIANT;
  const isCloud = variant === "cloud";

  let baseUrl: string;
  let headers: Record<string, string>;

  if (isCloud) {
    baseUrl = `https://${configs.JIRA_DOMAIN}.atlassian.net`;
    const credentials = Buffer.from(`${configs.JIRA_EMAIL}:${configs.JIRA_API_TOKEN}`).toString("base64");
    headers = {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    };
  } else {
    baseUrl = configs.JIRA_SERVER_URL.replace(/\/$/, "");
    headers = {
      Authorization: `Bearer ${configs.JIRA_PAT}`,
      Accept: "application/json",
    };
  }

  const apiVersion = isCloud ? "3" : "2";
  const response = await fetch(`${baseUrl}/rest/api/${apiVersion}/project`, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch Jira projects: ${response.status}`);
  }

  return response.json();
}

export async function saveJiraProjects(db: DbClient, dataSourceId: string, projects: JiraProject[]) {
  // Process in batches to avoid exhausting the connection pool
  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const batch = projects.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((project) =>
        db.project.upsert({
          where: {
            dataSourceId_externalId: {
              dataSourceId,
              externalId: project.id,
            },
          },
          create: {
            dataSourceId,
            externalId: project.id,
            key: project.key,
            name: project.name,
            provider: "JIRA",
            isEnabled: true,
          },
          update: {
            key: project.key,
            name: project.name,
          },
        })
      )
    );
  }
}
