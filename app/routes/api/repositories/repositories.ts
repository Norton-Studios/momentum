import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { type ActivityStatus, getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";
import type { DataSourceProvider } from "../../../../prisma/client/client.ts";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const search = url.searchParams.get("search") || undefined;
  const activity = (url.searchParams.get("activity") as ActivityStatus) || "all";
  const cursor = url.searchParams.get("cursor") || undefined;

  if (!provider) {
    return data({ error: "Provider is required" }, { status: 400 });
  }

  const dataSource = await getVcsDataSource(provider);
  if (!dataSource) {
    return data({ error: "No data source configured for this provider" }, { status: 400 });
  }

  const result = await getRepositoriesWithFilters(db, dataSource.id, { search, activity, cursor, limit: REPOSITORY_PAGE_SIZE });

  return data({
    repositories: result.repositories,
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
    filters: { search, activity },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle") {
    return handleToggleIntent(formData);
  }

  if (intent === "toggle-batch") {
    return handleBulkSelectIntent(formData);
  }

  return data({ error: "Invalid intent" }, { status: 400 });
}

async function getVcsDataSource(provider: string) {
  const providerMap: Record<string, DataSourceProvider> = {
    github: "GITHUB",
    gitlab: "GITLAB",
    bitbucket: "BITBUCKET",
  };

  const providerEnum = providerMap[provider.toLowerCase()];
  if (!providerEnum) {
    return null;
  }

  return db.dataSource.findFirst({
    where: {
      provider: providerEnum,
      isEnabled: true,
    },
    include: {
      configs: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function handleToggleIntent(formData: FormData) {
  const repositoryId = formData.get("repositoryId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (typeof repositoryId !== "string" || !repositoryId) {
    return data({ error: "Repository ID is required" }, { status: 400 });
  }

  try {
    await toggleRepository(db, repositoryId, isEnabled);
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle repository";
    return data({ error: message }, { status: 404 });
  }
}

async function handleBulkSelectIntent(formData: FormData) {
  const repositoryIds = formData.getAll("repositoryIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await toggleRepositoriesBatch(db, repositoryIds, isEnabled);

  return data({ success: true, count: result.count });
}
