import type { DataSourceProvider } from "@prisma/client";
import { type ActionFunctionArgs, data, type LoaderFunctionArgs, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { fetchGithubRepositories, saveRepositories } from "~/lib/repositories/fetch-repositories";
import { type ActivityStatus, bulkUpdateRepositorySelection, getRepositoriesWithFilters, selectAllMatchingFilters } from "~/lib/repositories/repository-filters";

export async function repositoriesLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const activity = (url.searchParams.get("activity") as ActivityStatus) || "all";
  const cursor = url.searchParams.get("cursor") || undefined;

  const dataSource = await getVcsDataSource();
  if (!dataSource) {
    return data({ error: "No VCS data source configured. Please configure a data source first." }, { status: 400 });
  }

  const repositories = await db.repository.findMany({
    where: { dataSourceId: dataSource.id },
    take: 1,
  });

  if (repositories.length === 0) {
    const hasInitialized = url.searchParams.get("initialized") === "true";
    if (!hasInitialized) {
      try {
        await initializeRepositories(dataSource);
        return redirect("/onboarding/repositories?initialized=true");
      } catch (error) {
        console.error("Failed to initialize repositories:", error);
        return data(
          {
            error: `Failed to fetch repositories: ${error instanceof Error ? error.message : "Unknown error"}. Please check your data source configuration.`,
          },
          { status: 500 }
        );
      }
    }
  }

  const result = await getRepositoriesWithFilters(db, dataSource.id, { search, activity, cursor, limit: 100 });

  return data({
    repositories: result.repositories,
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
    filters: { search, activity },
  });
}

export async function repositoriesAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle") {
    return handleToggleIntent(formData);
  }

  if (intent === "bulk-select") {
    return handleBulkSelectIntent(formData);
  }

  if (intent === "select-all-matching") {
    return handleSelectAllMatchingIntent(formData);
  }

  if (intent === "continue") {
    return redirect("/onboarding/importing");
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

async function getVcsDataSource() {
  const vcsProviders: DataSourceProvider[] = ["GITHUB", "GITLAB", "BITBUCKET"];

  return db.dataSource.findFirst({
    where: {
      provider: { in: vcsProviders },
      isEnabled: true,
    },
    include: {
      configs: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function initializeRepositories(dataSource: Awaited<ReturnType<typeof getVcsDataSource>>) {
  if (!dataSource) return;

  if (dataSource.provider === "GITHUB") {
    const token = dataSource.configs.find((c) => c.key === "GITHUB_TOKEN")?.value;
    const org = dataSource.configs.find((c) => c.key === "GITHUB_ORG")?.value;

    if (!token || !org) {
      throw new Error("GitHub token or organization not configured");
    }

    console.log(`Fetching repositories for GitHub org: ${org}`);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("GitHub API request timed out after 30 seconds")), 30000);
    });

    const repositories = await Promise.race([fetchGithubRepositories({ token, organization: org }), timeoutPromise]);

    console.log(`Fetched ${repositories.length} repositories from GitHub`);

    await saveRepositories(db, dataSource.id, repositories as Awaited<ReturnType<typeof fetchGithubRepositories>>, "GITHUB");

    console.log("Saved repositories to database");

    await setDefaultSelections(dataSource.id);

    console.log("Set default selections");
  }
}

async function setDefaultSelections(dataSourceId: string) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  await db.repository.updateMany({
    where: {
      dataSourceId,
      lastSyncAt: { gte: ninetyDaysAgo },
    },
    data: { isEnabled: true },
  });

  await db.repository.updateMany({
    where: {
      dataSourceId,
      OR: [{ lastSyncAt: { lt: ninetyDaysAgo } }, { lastSyncAt: null }],
    },
    data: { isEnabled: false },
  });
}

async function handleToggleIntent(formData: FormData) {
  const repositoryId = formData.get("repositoryId") as string;
  const isEnabled = formData.get("isEnabled") === "true";

  await db.repository.update({
    where: { id: repositoryId },
    data: { isEnabled },
  });

  return data({ success: true });
}

async function handleBulkSelectIntent(formData: FormData) {
  const repositoryIds = formData.getAll("repositoryIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  await bulkUpdateRepositorySelection(db, repositoryIds, isEnabled);

  return data({ success: true, count: repositoryIds.length });
}

async function handleSelectAllMatchingIntent(formData: FormData) {
  const search = (formData.get("search") as string) || undefined;
  const languages = formData.getAll("languages") as string[];
  const activity = (formData.get("activity") as ActivityStatus) || "all";
  const isEnabled = formData.get("isEnabled") === "true";

  const dataSource = await getVcsDataSource();
  if (!dataSource) {
    return data({ error: "No VCS data source configured" }, { status: 400 });
  }

  const count = await selectAllMatchingFilters(db, dataSource.id, { search, languages, activity }, isEnabled);

  // For a deselect action, return an empty array to clear client-side selections.
  if (!isEnabled) {
    return data({ success: true, count, repositoryIds: [] });
  }

  // For a select action, return all matching IDs so the client can update its state.
  const repositories = await db.repository.findMany({
    where: {
      dataSourceId: dataSource.id,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(activity !== "all" ? getActivityFilter(activity as ActivityStatus) : {}),
    },
    select: { id: true },
  });

  const repositoryIds = repositories.map((r) => r.id);

  return data({ success: true, count, repositoryIds });
}

function getActivityFilter(activity: ActivityStatus) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  switch (activity) {
    case "active":
      return { lastSyncAt: { gte: thirtyDaysAgo } };
    case "stale":
      return { lastSyncAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo } };
    case "inactive":
      return {
        OR: [{ lastSyncAt: { lt: ninetyDaysAgo } }, { lastSyncAt: null }],
      };
    default:
      return {};
  }
}
