import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createJiraClient, type JiraBoard } from "./client.js";

export const boardScript = {
  dataSourceName: "JIRA",
  resource: "board",
  dependsOn: ["project"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createJiraClient(context.env);

    const projects = await db.project.findMany({
      where: {
        dataSourceId: context.id,
        provider: "JIRA",
        isEnabled: true,
      },
      select: { id: true, key: true },
    });

    const errors: string[] = [];
    let totalBoards = 0;

    for (const project of projects) {
      try {
        const boards = await client.getBoards(project.key);
        for (const board of boards) {
          await upsertBoard(db, project.id, board);
          totalBoards++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import boards for project ${project.key}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalBoards },
    });
  },
};

async function upsertBoard(db: DbClient, projectId: string, board: JiraBoard) {
  const existingBoard = await db.board.findFirst({
    where: {
      projectId,
      externalId: String(board.id),
    },
  });

  if (existingBoard) {
    await db.board.update({
      where: { id: existingBoard.id },
      data: {
        name: board.name,
        boardType: board.type,
      },
    });
  } else {
    await db.board.create({
      data: {
        projectId,
        name: board.name,
        externalId: String(board.id),
        boardType: board.type,
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
