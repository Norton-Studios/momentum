import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import {
  getOptionalString,
  getOrCreateOrganization,
  getProviderEnum,
  getRequiredString,
  initializeProjects,
  initializeRepositories,
  saveDataSourceConfigs,
  upsertDataSource,
  validateRequiredFields,
} from "~/lib/data-sources";
import { getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";
import { extractConfigsFromForm, testConnection } from "~/routes/onboarding/data-sources/data-sources.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);

  const dataSources = await db.dataSource.findMany({
    include: {
      configs: {
        select: {
          key: true,
          value: true,
          isSecret: true,
        },
      },
      _count: {
        select: {
          runs: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return data({ dataSources, user: { name: user.name, email: user.email } });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test") {
    return handleTestIntent(formData);
  }

  if (intent === "connect") {
    return handleConnectIntent(formData);
  }

  if (intent === "delete") {
    return handleDeleteIntent(formData);
  }

  if (intent === "toggle-enabled") {
    return handleToggleEnabledIntent(formData);
  }

  if (intent === "fetch-repositories") {
    return handleFetchRepositoriesIntent(formData);
  }

  if (intent === "toggle-repository") {
    return handleToggleRepositoryIntent(formData);
  }

  if (intent === "toggle-repositories-batch") {
    return handleToggleRepositoriesBatchIntent(formData);
  }

  if (intent === "fetch-projects") {
    return handleFetchProjectsIntent(formData);
  }

  if (intent === "toggle-project") {
    return handleToggleProjectIntent(formData);
  }

  if (intent === "toggle-projects-batch") {
    return handleToggleProjectsBatchIntent(formData);
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

async function handleTestIntent(formData: FormData) {
  const provider = getRequiredString(formData, "provider");
  if (!provider) {
    return data({ testError: "Provider is required" }, { status: 400 });
  }

  const configs = extractConfigsFromForm(formData, provider);

  const testResult = await testConnection(provider, configs);
  if (!testResult.success) {
    return data({ testError: testResult.error ?? "Connection failed", provider }, { status: 400 });
  }
  return data({ testSuccess: true, provider });
}

async function handleConnectIntent(formData: FormData) {
  const provider = getRequiredString(formData, "provider");
  if (!provider) {
    return data({ errors: { provider: "Provider is required" } }, { status: 400 });
  }

  const providerEnum = getProviderEnum(provider);
  if (!providerEnum) {
    return data({ errors: { provider: "Invalid provider" } }, { status: 400 });
  }

  const configs = extractConfigsFromForm(formData, provider);
  const validationError = validateRequiredFields(provider, configs);
  if (validationError) {
    return data({ errors: validationError }, { status: 400 });
  }

  const organization = await getOrCreateOrganization(db);
  const dataSourceId = await upsertDataSource(db, organization.id, provider, providerEnum);
  await saveDataSourceConfigs(db, dataSourceId, configs);

  return data({ success: true, provider });
}

async function handleDeleteIntent(formData: FormData) {
  const dataSourceId = getRequiredString(formData, "dataSourceId");
  if (!dataSourceId) {
    return data({ error: "Data source ID is required" }, { status: 400 });
  }

  try {
    await db.dataSource.delete({
      where: { id: dataSourceId },
    });
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete data source";
    return data({ error: message }, { status: 500 });
  }
}

async function handleToggleEnabledIntent(formData: FormData) {
  const dataSourceId = getRequiredString(formData, "dataSourceId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (!dataSourceId) {
    return data({ error: "Data source ID is required" }, { status: 400 });
  }

  try {
    await db.dataSource.update({
      where: { id: dataSourceId },
      data: { isEnabled },
    });
    return data({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle data source";
    return data({ error: message }, { status: 500 });
  }
}

async function handleFetchRepositoriesIntent(formData: FormData) {
  const provider = getRequiredString(formData, "provider");
  if (!provider) {
    return data({ error: "Provider is required" }, { status: 400 });
  }

  const search = getOptionalString(formData, "search");
  const cursor = getOptionalString(formData, "cursor");

  const providerEnum = getProviderEnum(provider);
  if (!providerEnum) {
    return data({ error: "Invalid provider" }, { status: 400 });
  }

  const dataSource = await db.dataSource.findFirst({
    where: {
      provider: providerEnum,
      isEnabled: true,
    },
    include: {
      configs: true,
    },
  });

  if (!dataSource) {
    return data({ error: "Data source not found" }, { status: 404 });
  }

  const repositoryCount = await db.repository.count({
    where: { dataSourceId: dataSource.id },
  });

  if (repositoryCount === 0) {
    try {
      await initializeRepositories(db, dataSource, provider);
    } catch (error) {
      console.error("Failed to initialize repositories:", error);
      return data(
        {
          error: `Failed to fetch repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  }

  const result = await getRepositoriesWithFilters(db, dataSource.id, {
    search,
    cursor,
    limit: REPOSITORY_PAGE_SIZE,
  });

  return data({
    repositories: result.repositories,
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
  });
}

async function handleToggleRepositoryIntent(formData: FormData) {
  const repositoryId = getRequiredString(formData, "repositoryId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (!repositoryId) {
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

async function handleToggleRepositoriesBatchIntent(formData: FormData) {
  const repositoryIds = formData.getAll("repositoryIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await toggleRepositoriesBatch(db, repositoryIds, isEnabled);

  return data({ success: true, count: result.count });
}

async function handleFetchProjectsIntent(formData: FormData) {
  const provider = getRequiredString(formData, "provider");
  if (!provider) {
    return data({ error: "Provider is required" }, { status: 400 });
  }

  const providerEnum = getProviderEnum(provider);
  if (!providerEnum) {
    return data({ error: "Invalid provider" }, { status: 400 });
  }

  const dataSource = await db.dataSource.findFirst({
    where: {
      provider: providerEnum,
      isEnabled: true,
    },
    include: {
      configs: true,
    },
  });

  if (!dataSource) {
    return data({ error: "Data source not found" }, { status: 404 });
  }

  const projectCount = await db.project.count({
    where: { dataSourceId: dataSource.id },
  });

  if (projectCount === 0) {
    try {
      await initializeProjects(db, dataSource, provider);
    } catch (error) {
      console.error("Failed to initialize projects:", error);
      return data(
        {
          error: `Failed to fetch projects: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  }

  const projects = await db.project.findMany({
    where: { dataSourceId: dataSource.id },
    select: {
      id: true,
      name: true,
      key: true,
      isEnabled: true,
    },
    orderBy: { name: "asc" },
  });

  return data({ projects });
}

async function handleToggleProjectIntent(formData: FormData) {
  const projectId = getRequiredString(formData, "projectId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (!projectId) {
    return data({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    await db.project.update({
      where: { id: projectId },
      data: { isEnabled },
    });
    return data({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return data({ error: "Project not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Failed to toggle project";
    return data({ error: message }, { status: 500 });
  }
}

async function handleToggleProjectsBatchIntent(formData: FormData) {
  const projectIds = formData.getAll("projectIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await db.project.updateMany({
    where: { id: { in: projectIds } },
    data: { isEnabled },
  });

  return data({ success: true, count: result.count });
}
