import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createJiraClient, type JiraSprint } from "./client.js";

export const sprintScript = {
  dataSourceName: "JIRA",
  resource: "sprint",
  dependsOn: ["project", "board"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createJiraClient(context.env);

    const boards = await db.board.findMany({
      where: {
        project: {
          dataSourceId: context.id,
          provider: "JIRA",
          isEnabled: true,
        },
        boardType: "scrum",
      },
      select: { id: true, externalId: true, projectId: true },
    });

    const errors: string[] = [];
    let totalSprints = 0;

    for (const board of boards) {
      if (!board.externalId) continue;

      try {
        const sprints = await client.getSprints(Number(board.externalId));
        for (const sprint of sprints) {
          await upsertSprint(db, board.projectId, board.id, sprint);
          totalSprints++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import sprints for board ${board.externalId}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalSprints },
    });
  },
};

async function upsertSprint(db: DbClient, projectId: string, boardId: string, sprint: JiraSprint) {
  const existingSprint = await db.sprint.findFirst({
    where: {
      projectId,
      externalId: String(sprint.id),
    },
  });

  const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date();
  const endDate = sprint.endDate ? new Date(sprint.endDate) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const completedAt = sprint.completeDate ? new Date(sprint.completeDate) : null;

  if (existingSprint) {
    await db.sprint.update({
      where: { id: existingSprint.id },
      data: {
        name: sprint.name,
        goal: sprint.goal,
        state: sprint.state,
        startDate,
        endDate,
        completedAt,
      },
    });
  } else {
    await db.sprint.create({
      data: {
        projectId,
        boardId,
        name: sprint.name,
        externalId: String(sprint.id),
        goal: sprint.goal,
        state: sprint.state,
        startDate,
        endDate,
        completedAt,
      },
    });
  }
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
