import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Gitlab } from "@gitbeaker/rest";
import type { IssuePriority, IssueStatus, IssueType } from "@prisma/client";
import type { DbClient } from "~/db.server.js";

export const issueScript = {
  dataSourceName: "GITLAB",
  resource: "issue",
  dependsOn: ["repository", "contributor", "project"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const gitlab = new Gitlab({ token: context.env.GITLAB_TOKEN, host: context.env.GITLAB_HOST || "https://gitlab.com" });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITLAB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalIssues = 0;

    for (const repo of repos) {
      const result = await processProjectIssues(gitlab, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalIssues += result.count;
    }

    if (errors.length > 0) {
      await Promise.all(
        errors.map((message) =>
          db.importLog.create({
            data: {
              dataSourceRunId: context.runId,
              level: "ERROR",
              message,
              details: null,
            },
          })
        )
      );
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalIssues },
    });
  },
};

function mapGitLabStateToIssueStatus(state: string): IssueStatus {
  return state === "closed" ? "DONE" : "TODO";
}

function inferIssueType(labels: string[]): IssueType {
  const labelNames = labels.map((l) => l.toLowerCase());

  if (labelNames.some((l) => l.includes("bug") || l.includes("fix"))) return "BUG";
  if (labelNames.some((l) => l.includes("feature") || l.includes("enhancement"))) return "FEATURE";
  if (labelNames.some((l) => l.includes("epic"))) return "EPIC";
  if (labelNames.some((l) => l.includes("story"))) return "STORY";

  return "TASK";
}

function inferIssuePriority(labels: string[]): IssuePriority {
  const labelNames = labels.map((l) => l.toLowerCase());

  if (labelNames.some((l) => l.includes("critical") || l.includes("urgent"))) return "CRITICAL";
  if (labelNames.some((l) => l.includes("high") || l.includes("priority"))) return "HIGH";
  if (labelNames.some((l) => l.includes("low"))) return "LOW";
  if (labelNames.some((l) => l.includes("trivial"))) return "TRIVIAL";

  return "MEDIUM";
}

async function fetchIssuesForProject(gitlab: InstanceType<typeof Gitlab>, projectId: number, startDate: Date, endDate: Date): Promise<GitLabIssue[]> {
  const issues = (await gitlab.Issues.all({
    projectId,
    updatedAfter: startDate.toISOString(),
    updatedBefore: endDate.toISOString(),
    perPage: 100,
  })) as unknown as GitLabIssue[];

  return issues;
}

function transformIssue(issue: GitLabIssue, repoFullName: string): TransformedIssue {
  return {
    key: `${repoFullName}#${issue.iid}`,
    title: issue.title,
    description: issue.description,
    type: inferIssueType(issue.labels || []),
    status: mapGitLabStateToIssueStatus(issue.state),
    priority: inferIssuePriority(issue.labels || []),
    reporterEmail: issue.author ? issue.author.email || `${issue.author.username}@gitlab.com` : null,
    reporterName: issue.author?.name || issue.author?.username || null,
    reporterUsername: issue.author?.username,
    assigneeEmail: issue.assignee ? issue.assignee.email || `${issue.assignee.username}@gitlab.com` : null,
    assigneeName: issue.assignee?.name || issue.assignee?.username || null,
    assigneeUsername: issue.assignee?.username,
    url: issue.webUrl,
    resolvedAt: issue.closedAt ? new Date(issue.closedAt) : null,
  };
}

async function storeIssues(db: DbClient, projectId: string, repoFullName: string, issues: GitLabIssue[]): Promise<number> {
  let successCount = 0;

  for (const issue of issues) {
    try {
      const transformedIssue = transformIssue(issue, repoFullName);

      let reporterId: string | null = null;
      if (transformedIssue.reporterEmail && transformedIssue.reporterName) {
        const reporter = await db.contributor.upsert({
          where: {
            provider_email: {
              provider: "GITLAB",
              email: transformedIssue.reporterEmail,
            },
          },
          create: {
            name: transformedIssue.reporterName,
            email: transformedIssue.reporterEmail,
            provider: "GITLAB",
            username: transformedIssue.reporterUsername,
          },
          update: {},
        });
        reporterId = reporter.id;
      }

      let assigneeId: string | null = null;
      if (transformedIssue.assigneeEmail && transformedIssue.assigneeName) {
        const assignee = await db.contributor.upsert({
          where: {
            provider_email: {
              provider: "GITLAB",
              email: transformedIssue.assigneeEmail,
            },
          },
          create: {
            name: transformedIssue.assigneeName,
            email: transformedIssue.assigneeEmail,
            provider: "GITLAB",
            username: transformedIssue.assigneeUsername,
          },
          update: {},
        });
        assigneeId = assignee.id;
      }

      await db.issue.upsert({
        where: { key: transformedIssue.key },
        create: {
          projectId,
          key: transformedIssue.key,
          title: transformedIssue.title,
          description: transformedIssue.description,
          type: transformedIssue.type,
          status: transformedIssue.status,
          priority: transformedIssue.priority,
          reporterId,
          assigneeId,
          url: transformedIssue.url,
          resolvedAt: transformedIssue.resolvedAt,
        },
        update: {
          title: transformedIssue.title,
          description: transformedIssue.description,
          type: transformedIssue.type,
          status: transformedIssue.status,
          priority: transformedIssue.priority,
          assigneeId,
          resolvedAt: transformedIssue.resolvedAt,
        },
      });

      successCount++;
    } catch (error) {
      console.error(`Failed to store issue #${issue.iid}:`, error);
    }
  }

  return successCount;
}

async function processProjectIssues(
  gitlab: InstanceType<typeof Gitlab>,
  db: DbClient,
  repo: { id: string; fullName: string },
  startDate: Date,
  endDate: Date
): Promise<{ count: number; error?: string }> {
  try {
    const project = await db.project.findUnique({
      where: { key: repo.fullName },
    });

    if (!project) {
      return {
        count: 0,
        error: `Project not found for repository ${repo.fullName}`,
      };
    }

    const gitlabProject = await gitlab.Projects.show(repo.fullName);
    const issues = await fetchIssuesForProject(gitlab, gitlabProject.id, startDate, endDate);
    const count = await storeIssues(db, project.id, repo.fullName, issues);
    return { count };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      count: 0,
      error: `Failed to import issues for ${repo.fullName}: ${errorMessage}`,
    };
  }
}

interface GitLabIssue {
  iid: number;
  title: string;
  description?: string | null;
  state: string;
  labels?: string[];
  closedAt?: string | null;
  webUrl: string;
  author?: { username: string; name?: string; email?: string | null } | null;
  assignee?: { username: string; name?: string; email?: string | null } | null;
}

interface TransformedIssue {
  key: string;
  title: string;
  description: string | null | undefined;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterUsername?: string;
  assigneeEmail: string | null;
  assigneeName: string | null;
  assigneeUsername?: string;
  url: string;
  resolvedAt: Date | null;
}
