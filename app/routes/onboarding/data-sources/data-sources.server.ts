import { Gitlab } from "@gitbeaker/rest";
import { Octokit } from "@octokit/rest";
import type { ActionFunctionArgs } from "react-router";
import { data, redirect } from "react-router";
import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import {
  getOrCreateOrganization,
  getProviderEnum,
  initializeProjects,
  initializeRepositories,
  PROVIDER_CONFIGS,
  saveDataSourceConfigs,
  upsertDataSource,
  validateRequiredFields,
} from "~/lib/data-sources";
import { getRepositoriesWithFilters } from "~/lib/repositories/repository-filters";
import { REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "~/lib/repositories/toggle-repositories";

export async function datasourcesAction({ request }: ActionFunctionArgs) {
  await requireAdmin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "test") {
    return handleTestIntent(formData);
  }

  if (intent === "connect") {
    return handleConnectIntent(formData);
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

  if (intent === "continue") {
    return redirect("/onboarding/importing");
  }

  return data({ errors: { form: "Invalid action" } }, { status: 400 });
}

async function handleTestIntent(formData: FormData) {
  const provider = formData.get("provider") as string;
  const configs = extractConfigsFromForm(formData, provider);

  const testResult = await testConnection(provider, configs);
  if (!testResult.success) {
    return data({ testError: testResult.error ?? "Connection failed", provider }, { status: 400 });
  }
  return data({ testSuccess: true, provider });
}

async function handleConnectIntent(formData: FormData) {
  const provider = formData.get("provider");

  if (typeof provider !== "string" || !provider) {
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

async function handleFetchRepositoriesIntent(formData: FormData) {
  const provider = formData.get("provider") as string;
  const search = formData.get("search") as string | undefined;
  const cursor = formData.get("cursor") as string | undefined;

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

async function handleToggleRepositoriesBatchIntent(formData: FormData) {
  const repositoryIds = formData.getAll("repositoryIds") as string[];
  const isEnabled = formData.get("isEnabled") === "true";

  const result = await toggleRepositoriesBatch(db, repositoryIds, isEnabled);

  return data({ success: true, count: result.count });
}

async function handleFetchProjectsIntent(formData: FormData) {
  const provider = formData.get("provider") as string;

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
  const projectId = formData.get("projectId");
  const isEnabled = formData.get("isEnabled") === "true";

  if (typeof projectId !== "string" || !projectId) {
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

export function extractConfigsFromForm(formData: FormData, provider: string): Record<string, string> {
  const providerConfig = PROVIDER_CONFIGS[provider];
  if (!providerConfig) return {};

  const configs: Record<string, string> = {};
  for (const field of providerConfig.fields) {
    const value = formData.get(field.key);
    if (typeof value === "string" && value) {
      configs[field.key] = value;
    }
  }
  return configs;
}

export async function testConnection(provider: string, configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  if (provider === "github") {
    return testGitHubConnection(configs);
  }

  if (provider === "gitlab") {
    return testGitLabConnection(configs);
  }

  if (provider === "jira") {
    return testJiraConnection(configs);
  }

  return { success: false, error: "Test connection not implemented for this provider" };
}

async function testGitHubConnection(configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const token = configs.GITHUB_TOKEN;
  const org = configs.GITHUB_ORG;
  if (!token || !org) {
    return { success: false, error: "Token and organization are required" };
  }
  try {
    const octokit = new Octokit({ auth: token });
    await octokit.orgs.get({ org });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: message };
  }
}

async function testGitLabConnection(configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const token = configs.GITLAB_TOKEN;
  if (!token) {
    return { success: false, error: "Token is required" };
  }
  try {
    const host = configs.GITLAB_HOST || "https://gitlab.com";
    const gitlab = new Gitlab({ token, host });
    await gitlab.Users.showCurrentUser();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: message };
  }
}

async function testJiraConnection(configs: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  const variant = configs.JIRA_VARIANT;
  if (!variant) {
    return { success: false, error: "Jira version is required" };
  }

  try {
    const isCloud = variant === "cloud";
    let baseUrl: string;
    let headers: Record<string, string>;

    if (isCloud) {
      const domain = configs.JIRA_DOMAIN;
      const email = configs.JIRA_EMAIL;
      const apiToken = configs.JIRA_API_TOKEN;

      if (!domain || !email || !apiToken) {
        return { success: false, error: "Domain, email, and API token are required for Jira Cloud" };
      }

      baseUrl = `https://${domain}.atlassian.net`;
      const credentials = Buffer.from(`${email}:${apiToken}`).toString("base64");
      headers = {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      };
    } else {
      const serverUrl = configs.JIRA_SERVER_URL;
      const pat = configs.JIRA_PAT;

      if (!serverUrl || !pat) {
        return { success: false, error: "Server URL and Personal Access Token are required for Jira Data Center" };
      }

      baseUrl = serverUrl.replace(/\/$/, "");
      headers = {
        Authorization: `Bearer ${pat}`,
        Accept: "application/json",
      };
    }

    const apiVersion = isCloud ? "3" : "2";
    const response = await fetch(`${baseUrl}/rest/api/${apiVersion}/myself`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira API error ${response.status}:`, errorText);
      return { success: false, error: `Jira API returned ${response.status}. Please check your credentials.` };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: message };
  }
}
