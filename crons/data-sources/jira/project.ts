import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createJiraClient } from "./client.js";

export const projectScript = {
  dataSourceName: "JIRA",
  resource: "project",
  dependsOn: [],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createJiraClient(context.env);
    const jiraProjects = await client.getProjects();

    const errors: string[] = [];
    let totalProjects = 0;

    for (const jiraProject of jiraProjects) {
      try {
        await upsertProject(db, context.id, jiraProject, client.baseUrl);
        totalProjects++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import project ${jiraProject.key}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalProjects },
    });
  },
};

async function upsertProject(db: DbClient, dataSourceId: string, jiraProject: JiraProjectData, baseUrl: string) {
  await db.project.upsert({
    where: { key: jiraProject.key },
    create: {
      dataSourceId,
      name: jiraProject.name,
      key: jiraProject.key,
      description: jiraProject.description,
      provider: "JIRA",
      url: `${baseUrl}/browse/${jiraProject.key}`,
      externalId: jiraProject.id,
      isEnabled: true,
    },
    update: {
      name: jiraProject.name,
      description: jiraProject.description,
      url: `${baseUrl}/browse/${jiraProject.key}`,
      externalId: jiraProject.id,
    },
  });
}

async function logErrors(db: DbClient, runId: string, errors: string[]) {
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

interface JiraProjectData {
  id: string;
  key: string;
  name: string;
  description?: string;
}
