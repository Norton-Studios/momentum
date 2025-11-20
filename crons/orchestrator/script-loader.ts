import type { DataSource, DataSourceConfig, PrismaClient } from "@prisma/client";

export async function loadAllImportScripts(): Promise<DataSourceScript[]> {
  const allScripts: DataSourceScript[] = [];

  // List of all potential providers
  const providers = ["github", "gitlab", "jenkins", "circleci", "sonarqube"];

  for (const provider of providers) {
    try {
      // Dynamically import the provider module
      const module = await import(`@crons/data-sources/${provider}/index.js`);

      // Provider modules export a 'scripts' array
      if (module.scripts && Array.isArray(module.scripts)) {
        allScripts.push(...module.scripts);
      }
    } catch {
      // Provider not implemented yet, skip silently
      console.log(`Provider ${provider} not found, skipping`);
    }
  }

  return allScripts;
}

export async function getEnabledScripts(
  db: PrismaClient,
  allScripts: DataSourceScript[]
): Promise<{
  scripts: DataSourceScript[];
  dataSourceMap: Map<DataSourceScript, DataSource & { configs: DataSourceConfig[] }>;
}> {
  // Load all enabled data sources
  const dataSources = await db.dataSource.findMany({
    where: { isEnabled: true },
    include: { configs: true },
  });

  // Filter scripts - keep only those with enabled data sources
  const enabledScripts = allScripts.filter((script) => dataSources.some((ds) => ds.provider === script.dataSourceName));

  // Create a map from script to its data source
  const dataSourceMap = new Map<DataSourceScript, DataSource & { configs: DataSourceConfig[] }>();

  for (const script of enabledScripts) {
    const dataSource = dataSources.find((ds) => ds.provider === script.dataSourceName);
    if (dataSource) {
      dataSourceMap.set(script, dataSource);
    }
  }

  return { scripts: enabledScripts, dataSourceMap };
}

export function buildEnvironment(configs: DataSourceConfig[]): Record<string, string> {
  return configs.reduce(
    (acc, config) => {
      acc[config.key] = config.value;
      return acc;
    },
    {} as Record<string, string>
  );
}

export interface DataSourceScript {
  dataSourceName: string; // 'GITHUB', 'GITLAB' - matches DataSourceProvider enum
  resource: string; // 'commit', 'repository', 'pull-request'
  dependsOn: string[]; // Generic: ['repository'], ['commit']
  importWindowDays: number; // Default lookback window (e.g., 90)
  run: (context: ExecutionContext) => Promise<void>;
}

export interface ExecutionContext {
  dataSourceId: string; // ID of the DataSource record
  dataSourceName: string; // 'GITHUB', 'GITLAB' - provider name
  env: Record<string, string>; // Environment variables from DataSourceConfig
  db: PrismaClient; // Database client
  startDate: Date; // Start of date range for incremental sync
  endDate: Date; // End of date range
  runId: string; // DataSourceRun ID for logging
}
