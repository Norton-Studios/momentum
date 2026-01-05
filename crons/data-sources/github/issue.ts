import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import { Octokit } from "@octokit/rest";
import type { DbClient } from "~/db.server.js";
import type { IssuePriority, IssueStatus, IssueType } from "../../db.ts";

export const issueScript = {
  dataSourceName: "GITHUB",
  resource: "issue",
  dependsOn: ["repository", "contributor", "project"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    const repos = await db.repository.findMany({
      where: {
        provider: "GITHUB",
        dataSourceId: context.id,
        isEnabled: true,
      },
    });

    const errors: string[] = [];
    let totalIssues = 0;

    for (const repo of repos) {
      const result = await processRepositoryIssues(octokit, db, repo, context.startDate, context.endDate);
      if (result.error) {
        errors.push(result.error);
      }
      totalIssues += result.count;
    }

    if (errors.length > 0) {
      await logIssueErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalIssues },
    });
  },
};

function mapGitHubStateToIssueStatus(state: string): IssueStatus {
  return state === "closed" ? "DONE" : "TODO";
}

function getLabelName(label: GitHubLabel): string {
  if (typeof label === "string") return label.toLowerCase();
  return (label.name || "").toLowerCase();
}

function inferIssueType(labels: GitHubLabel[]): IssueType {
  const labelNames = labels.map(getLabelName);

  if (labelNames.some((l) => l.includes("bug") || l.includes("fix"))) return "BUG";
  if (labelNames.some((l) => l.includes("feature") || l.includes("enhancement"))) return "FEATURE";
  if (labelNames.some((l) => l.includes("epic"))) return "EPIC";
  if (labelNames.some((l) => l.includes("story"))) return "STORY";

  return "TASK";
}

function inferIssuePriority(labels: GitHubLabel[]): IssuePriority {
  const labelNames = labels.map(getLabelName);

  if (labelNames.some((l) => l.includes("critical") || l.includes("urgent"))) return "CRITICAL";
  if (labelNames.some((l) => l.includes("high") || l.includes("priority"))) return "HIGH";
  if (labelNames.some((l) => l.includes("low"))) return "LOW";
  if (labelNames.some((l) => l.includes("trivial"))) return "TRIVIAL";

  return "MEDIUM";
}

function isWithinDateRange(updatedAt: string, startDate: Date, endDate: Date): boolean {
  const date = new Date(updatedAt);
  return date >= startDate && date <= endDate;
}

function shouldStopPaginating(oldestIssue: GitHubIssue, startDate: Date): boolean {
  return new Date(oldestIssue.updated_at) < startDate;
}

async function fetchIssuesForRepository(octokit: Octokit, owner: string, repoName: string, startDate: Date, endDate: Date): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];

  for await (const response of octokit.paginate.iterator(octokit.issues.listForRepo, {
    owner,
    repo: repoName,
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: 100,
  })) {
    const issuesOnly = response.data.filter((item) => !item.pull_request);
    const filteredIssues = issuesOnly.filter((issue) => isWithinDateRange(issue.updated_at, startDate, endDate));
    allIssues.push(...filteredIssues);

    const oldestItem = response.data[response.data.length - 1];
    if (oldestItem && shouldStopPaginating(oldestItem, startDate)) {
      break;
    }
  }

  return allIssues;
}

function transformIssue(issue: GitHubIssue, repoFullName: string): TransformedIssue {
  return {
    key: `${repoFullName}#${issue.number}`,
    title: issue.title,
    description: issue.body,
    type: inferIssueType(issue.labels),
    status: mapGitHubStateToIssueStatus(issue.state),
    priority: inferIssuePriority(issue.labels),
    reporterEmail: issue.user ? issue.user.email || `${issue.user.login}@github.com` : null,
    reporterName: issue.user?.login || null,
    assigneeEmail: issue.assignee ? issue.assignee.email || `${issue.assignee.login}@github.com` : null,
    assigneeName: issue.assignee?.login || null,
    url: issue.html_url,
    resolvedAt: issue.closed_at ? new Date(issue.closed_at) : null,
  };
}

async function ensureContributorExists(db: DbClient, email: string, name: string, username?: string): Promise<string> {
  const contributor = await db.contributor.upsert({
    where: {
      provider_email: {
        provider: "GITHUB",
        email,
      },
    },
    create: {
      name,
      email,
      provider: "GITHUB",
      username,
    },
    update: {},
  });
  return contributor.id;
}

async function upsertIssue(db: DbClient, projectId: string, transformedIssue: TransformedIssue, reporterId: string | null, assigneeId: string | null): Promise<void> {
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
}

async function storeIssues(db: DbClient, projectId: string, repoFullName: string, issues: GitHubIssue[]): Promise<number> {
  let successCount = 0;

  for (const issue of issues) {
    try {
      const transformedIssue = transformIssue(issue, repoFullName);

      let reporterId: string | null = null;
      if (transformedIssue.reporterEmail && transformedIssue.reporterName) {
        reporterId = await ensureContributorExists(db, transformedIssue.reporterEmail, transformedIssue.reporterName, issue.user?.login);
      }

      let assigneeId: string | null = null;
      if (transformedIssue.assigneeEmail && transformedIssue.assigneeName) {
        assigneeId = await ensureContributorExists(db, transformedIssue.assigneeEmail, transformedIssue.assigneeName, issue.assignee?.login);
      }

      await upsertIssue(db, projectId, transformedIssue, reporterId, assigneeId);
      successCount++;
    } catch (error) {
      console.error(`Failed to store issue #${issue.number}:`, error);
    }
  }

  return successCount;
}

async function processRepositoryIssues(
  octokit: Octokit,
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

    const [owner, repoName] = repo.fullName.split("/");
    const issues = await fetchIssuesForRepository(octokit, owner, repoName, startDate, endDate);
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

async function logIssueErrors(db: DbClient, runId: string, errors: string[]): Promise<void> {
  if (errors.length === 0) return;

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

type GitHubLabel = string | { name?: string };

interface GitHubIssue {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  updated_at: string;
  closed_at?: string | null;
  html_url: string;
  user?: { login: string; email?: string | null } | null;
  assignee?: { login: string; email?: string | null } | null;
  labels: GitHubLabel[];
  pull_request?: unknown;
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
  assigneeEmail: string | null;
  assigneeName: string | null;
  url: string;
  resolvedAt: Date | null;
}
