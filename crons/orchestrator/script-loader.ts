import type { DataSource, DataSourceConfig } from "@prisma/client";
import type { DbClient } from "~/db.server.js";
import { scripts as githubScripts } from "../data-sources/github/index.js";
import { scripts as gitlabScripts } from "../data-sources/gitlab/index.js";

// Static imports for all implemented providers
// Add new providers here as they're implemented
const PROVIDER_SCRIPTS: Record<string, DataSourceScript[]> = {
  github: githubScripts,
  gitlab: gitlabScripts,
};

export async function getEnabledScripts(db: DbClient): Promise<DataSourceScriptMap> {
  const dataSources = await db.dataSource.findMany({
    where: { isEnabled: true },
    include: { configs: true },
  });

  const allScripts = await loadAllImportScripts();
  const enabledScripts = allScripts.filter((script) => dataSources.some((ds) => ds.provider === script.dataSourceName));
  const dataSourceMap = new Map();

  for (const script of enabledScripts) {
    const dataSource = dataSources.find((ds) => ds.provider === script.dataSourceName);
    if (dataSource) {
      const env = buildEnvironment(dataSource.configs);
      dataSourceMap.set(script, { ...dataSource, env });
    }
  }

  return dataSourceMap;
}

async function loadAllImportScripts(): Promise<DataSourceScript[]> {
  const allScripts: DataSourceScript[] = [];

  for (const [provider, scripts] of Object.entries(PROVIDER_SCRIPTS)) {
    if (scripts && Array.isArray(scripts)) {
      allScripts.push(...scripts);
    } else {
      console.log(`[script-loader] Provider ${provider} has no scripts`);
    }
  }

  return allScripts;
}

function buildEnvironment(configs: DataSourceConfig[]): Record<string, string> {
  return configs.reduce(
    (acc, config) => {
      acc[config.key] = config.value;
      return acc;
    },
    {} as Record<string, string>
  );
}

export type DataSourceScriptMap = Map<DataSourceScript, ExecutionContext>;

export interface DataSourceScript {
  dataSourceName: string; // 'GITHUB', 'GITLAB' - matches DataSourceProvider enum
  resource: string; // 'commit', 'repository', 'pull-request'
  dependsOn: string[]; // Generic: ['repository'], ['commit']
  importWindowDays: number; // Default lookback window (e.g., 90)
  run: (db: DbClient, context: ExecutionContext) => Promise<void>;
}

export type ExecutionContext = DataSource & {
  env: Record<string, string>; // Environment variables from DataSourceConfig
  startDate: Date; // Start of date range for incremental sync
  endDate: Date; // End of date range
  runId: string; // DataSourceRun ID for logging
};
