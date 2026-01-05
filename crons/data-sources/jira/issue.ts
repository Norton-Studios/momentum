import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import type { IssuePriority, IssueStatus, IssueType } from "../../db.ts";
import { createJiraClient, formatJiraDate, type JiraAdfDocument, type JiraIssue, type JiraUser } from "./client.js";

// Custom field IDs - defaults are for Jira Cloud, can be overridden via env
const DEFAULT_STORY_POINTS_FIELD = "customfield_10016";
const DEFAULT_SPRINT_FIELD = "customfield_10020";

export const issueScript = {
  dataSourceName: "JIRA",
  resource: "issue",
  dependsOn: ["project", "board", "sprint"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createJiraClient(context.env);

    // Allow custom field IDs to be overridden via environment
    const storyPointsField = context.env.JIRA_STORY_POINTS_FIELD || DEFAULT_STORY_POINTS_FIELD;
    const sprintField = context.env.JIRA_SPRINT_FIELD || DEFAULT_SPRINT_FIELD;

    const projects = await db.project.findMany({
      where: {
        dataSourceId: context.id,
        provider: "JIRA",
        isEnabled: true,
      },
      select: { id: true, key: true },
    });

    const errors: string[] = [];
    let totalIssues = 0;

    for (const project of projects) {
      try {
        const jql = buildJql(project.key, context.startDate, context.endDate);
        const issues = await client.getAllIssues(jql, getIssueFields(storyPointsField));

        for (const issue of issues) {
          await processIssue(db, context.id, project.id, issue, client.baseUrl, storyPointsField, sprintField);
          totalIssues++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import issues for project ${project.key}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalIssues },
    });
  },
};

function getIssueFields(storyPointsField: string): string[] {
  return ["summary", "description", "issuetype", "status", "priority", "assignee", "reporter", "created", "updated", "resolutiondate", storyPointsField];
}

function buildJql(projectKey: string, startDate: Date, endDate: Date): string {
  const start = formatJiraDate(startDate);
  const end = formatJiraDate(endDate);
  return `project = "${projectKey}" AND updated >= "${start}" AND updated <= "${end}" ORDER BY updated DESC`;
}

async function processIssue(db: DbClient, _dataSourceId: string, projectId: string, issue: JiraIssue, baseUrl: string, storyPointsField: string, sprintField: string) {
  const reporterId = await ensureContributor(db, issue.fields.reporter);
  const assigneeId = await ensureContributor(db, issue.fields.assignee);

  const boardId = await findBoardForIssue(db, projectId);
  const sprintId = await findSprintForIssue(db, projectId, issue, sprintField);

  await db.issue.upsert({
    where: { key: issue.key },
    create: {
      projectId,
      boardId,
      sprintId,
      key: issue.key,
      externalId: issue.id,
      title: issue.fields.summary,
      description: extractDescription(issue.fields.description),
      type: mapIssueType(issue.fields.issuetype.name),
      status: mapIssueStatus(issue.fields.status),
      statusName: issue.fields.status.name,
      priority: mapIssuePriority(issue.fields.priority?.name),
      assigneeId,
      reporterId,
      storyPoints: extractStoryPoints(issue, storyPointsField),
      url: `${baseUrl}/browse/${issue.key}`,
      resolvedAt: issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null,
    },
    update: {
      title: issue.fields.summary,
      description: extractDescription(issue.fields.description),
      type: mapIssueType(issue.fields.issuetype.name),
      status: mapIssueStatus(issue.fields.status),
      statusName: issue.fields.status.name,
      priority: mapIssuePriority(issue.fields.priority?.name),
      assigneeId,
      sprintId,
      resolvedAt: issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null,
    },
  });
}

async function ensureContributor(db: DbClient, user: JiraUser | undefined | null): Promise<string | null> {
  if (!user) return null;

  const email = user.emailAddress || `${user.accountId || user.key || user.name}@jira.local`;
  const name = user.displayName || user.name || "Unknown";

  const contributor = await db.contributor.upsert({
    where: {
      provider_email: {
        provider: "JIRA",
        email,
      },
    },
    create: {
      name,
      email,
      provider: "JIRA",
      username: user.name || user.accountId,
      providerUserId: user.accountId || user.key,
      avatarUrl: user.avatarUrls?.["48x48"],
    },
    update: {
      name,
      avatarUrl: user.avatarUrls?.["48x48"],
    },
  });

  return contributor.id;
}

async function findBoardForIssue(db: DbClient, projectId: string): Promise<string | null> {
  const board = await db.board.findFirst({
    where: { projectId },
    select: { id: true },
  });
  return board?.id ?? null;
}

async function findSprintForIssue(db: DbClient, projectId: string, issue: JiraIssue, sprintFieldName: string): Promise<string | null> {
  const sprintFieldValue = issue.fields[sprintFieldName] as { id: number }[] | undefined;
  if (!sprintFieldValue || sprintFieldValue.length === 0) return null;

  const latestSprintId = String(sprintFieldValue[sprintFieldValue.length - 1].id);

  const sprint = await db.sprint.findFirst({
    where: {
      projectId,
      externalId: latestSprintId,
    },
    select: { id: true },
  });

  return sprint?.id ?? null;
}

function extractDescription(description: string | JiraAdfDocument | undefined | null): string | null {
  if (!description) return null;

  if (typeof description === "string") {
    return description;
  }

  if (description.type === "doc" && Array.isArray(description.content)) {
    return extractTextFromAdf(description.content);
  }

  return null;
}

function extractTextFromAdf(content: unknown[]): string {
  const texts: string[] = [];

  for (const node of content) {
    if (typeof node !== "object" || node === null) continue;

    const nodeObj = node as Record<string, unknown>;

    if (nodeObj.type === "text" && typeof nodeObj.text === "string") {
      texts.push(nodeObj.text);
    }

    if (Array.isArray(nodeObj.content)) {
      texts.push(extractTextFromAdf(nodeObj.content));
    }
  }

  return texts.join(" ");
}

function extractStoryPoints(issue: JiraIssue, storyPointsField: string): number | null {
  const points = issue.fields[storyPointsField];
  if (typeof points === "number") {
    return points;
  }
  return null;
}

function mapIssueType(typeName: string): IssueType {
  const normalizedName = typeName.toLowerCase();

  if (normalizedName.includes("bug")) return "BUG";
  if (normalizedName.includes("epic")) return "EPIC";
  if (normalizedName.includes("story")) return "STORY";
  if (normalizedName.includes("subtask") || normalizedName.includes("sub-task")) return "SUBTASK";
  if (normalizedName.includes("feature") || normalizedName.includes("enhancement")) return "FEATURE";

  return "TASK";
}

function mapIssueStatus(status: { name: string; statusCategory?: { key: string } }): IssueStatus {
  const categoryKey = status.statusCategory?.key;

  if (categoryKey === "done") return "DONE";
  if (categoryKey === "indeterminate") return "IN_PROGRESS";

  const normalizedName = status.name.toLowerCase();

  if (normalizedName.includes("done") || normalizedName.includes("closed") || normalizedName.includes("resolved")) {
    return "DONE";
  }
  if (normalizedName.includes("progress") || normalizedName.includes("active") || normalizedName.includes("dev")) {
    return "IN_PROGRESS";
  }
  if (normalizedName.includes("review") || normalizedName.includes("testing") || normalizedName.includes("qa")) {
    return "IN_REVIEW";
  }
  if (normalizedName.includes("block") || normalizedName.includes("impediment")) {
    return "BLOCKED";
  }
  if (normalizedName.includes("cancel") || normalizedName.includes("won't")) {
    return "CANCELLED";
  }

  return "TODO";
}

function mapIssuePriority(priorityName: string | undefined): IssuePriority {
  if (!priorityName) return "MEDIUM";

  const normalizedName = priorityName.toLowerCase();

  if (normalizedName.includes("highest") || normalizedName.includes("critical") || normalizedName.includes("blocker")) {
    return "CRITICAL";
  }
  if (normalizedName.includes("high")) return "HIGH";
  if (normalizedName.includes("low")) return "LOW";
  if (normalizedName.includes("lowest") || normalizedName.includes("trivial")) return "TRIVIAL";

  return "MEDIUM";
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
