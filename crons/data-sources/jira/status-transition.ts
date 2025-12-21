import type { ExecutionContext } from "@crons/orchestrator/script-loader.js";
import type { DbClient } from "~/db.server.js";
import { createJiraClient, type JiraChangelog, type JiraUser } from "./client.js";

export const statusTransitionScript = {
  dataSourceName: "JIRA",
  resource: "status-transition",
  dependsOn: ["project", "issue"],
  importWindowDays: 90,

  async run(db: DbClient, context: ExecutionContext) {
    const client = createJiraClient(context.env);

    const issues = await db.issue.findMany({
      where: {
        project: {
          dataSourceId: context.id,
          provider: "JIRA",
          isEnabled: true,
        },
        updatedAt: {
          gte: context.startDate,
          lte: context.endDate,
        },
      },
      select: { id: true, key: true, externalId: true },
    });

    const errors: string[] = [];
    let totalTransitions = 0;

    for (const issue of issues) {
      const issueKey = issue.externalId || issue.key;

      try {
        const changelog = await client.getIssueChangelog(issueKey);
        const statusChanges = extractStatusChanges(changelog.values);

        for (const change of statusChanges) {
          const authorId = await ensureContributor(db, change.author);
          await upsertTransition(db, issue.id, change, authorId);
          totalTransitions++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import transitions for issue ${issue.key}: ${errorMessage}`);
      }
    }

    if (errors.length > 0) {
      await logErrors(db, context.runId, errors);
    }

    await db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: totalTransitions },
    });
  },
};

function extractStatusChanges(changelogs: JiraChangelog[]): StatusChange[] {
  const statusChanges: StatusChange[] = [];

  for (const changelog of changelogs) {
    for (const item of changelog.items) {
      if (item.field === "status" || item.fieldId === "status") {
        statusChanges.push({
          fromStatus: item.fromString || null,
          toStatus: item.toString || "",
          transitionedAt: new Date(changelog.created),
          author: changelog.author,
          changelogId: changelog.id,
        });
      }
    }
  }

  return statusChanges;
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

async function upsertTransition(db: DbClient, issueId: string, change: StatusChange, authorId: string | null) {
  const existingTransition = await db.issueStatusTransition.findFirst({
    where: {
      issueId,
      transitionedAt: change.transitionedAt,
      toStatus: change.toStatus,
    },
  });

  if (!existingTransition) {
    await db.issueStatusTransition.create({
      data: {
        issueId,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        transitionedAt: change.transitionedAt,
        authorId,
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

interface StatusChange {
  fromStatus: string | null;
  toStatus: string;
  transitionedAt: Date;
  author: JiraUser;
  changelogId: string;
}
