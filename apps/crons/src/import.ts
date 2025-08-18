import fg from "fast-glob";
import path from "node:path";
import pGraph from "p-graph";
import { prisma, type PrismaClient } from "@mmtm/database";

interface DataSourceScript {
  name: string;
  dataSource: string;
  scriptName: string;
  resources: string[];
  dependencies: string[];
  importWindowDuration: number;
  run: (env: Record<string, string>, db: PrismaClient, tenantId: string, startDate: Date, endDate: Date) => Promise<void>;
}

interface TenantEnvironment {
  tenantId: string;
  dataSource: string;
  env: Record<string, string>;
}

/**
 * Query tenant configurations from the database
 */
async function getTenantConfigurations(db: PrismaClient): Promise<TenantEnvironment[]> {
  const configs = await db.tenantDataSourceConfig.findMany({
    include: { tenant: true },
  });

  // Group configurations by tenant and data source
  const grouped = new Map<string, Array<(typeof configs)[0]>>();

  for (const config of configs) {
    const key = `${config.tenantId}:${config.dataSource}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(config);
  }

  // Build environment objects
  const environments: TenantEnvironment[] = [];

  for (const [key, configGroup] of grouped.entries()) {
    const [tenantId, dataSource] = key.split(":");
    const env: Record<string, string> = {};

    for (const config of configGroup) {
      env[config.key] = config.value;
    }

    environments.push({ tenantId, dataSource, env });
  }

  return environments;
}

/**
 * Scan and load data source plugins that match configured data sources
 */
async function loadDataSourceScripts(configuredDataSources: Set<string>): Promise<DataSourceScript[]> {
  const scripts: DataSourceScript[] = [];

  for (const dataSource of configuredDataSources) {
    const scriptPaths = await fg([`../../libs/plugins/data-sources/${dataSource}/*.ts`, `!../../libs/plugins/data-sources/${dataSource}/*.test.ts`], {
      absolute: true,
      cwd: __dirname,
    });

    for (const scriptPath of scriptPaths) {
      try {
        const module = await import(scriptPath);
        const scriptName = path.basename(scriptPath, ".ts");

        // Skip if required exports are missing
        if (!module.run || typeof module.run !== "function") {
          console.log(`Skipping ${scriptPath}: missing 'run' function`);
          continue;
        }

        scripts.push({
          name: `${dataSource}-${scriptName}`,
          dataSource,
          scriptName,
          resources: module.resources || [],
          dependencies: module.dependencies || [],
          importWindowDuration: module.importWindowDuration || 86400 * 1000, // Default 24 hours
          run: module.run,
        });

        console.log(`Loaded script: ${dataSource}/${scriptName}`);
      } catch (error) {
        console.error(`Error loading script from ${scriptPath}:`, error);
      }
    }
  }

  return scripts;
}

/**
 * Build dependency graph for scripts
 */
function buildDependencyGraph(scripts: DataSourceScript[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  // Initialize graph with all scripts
  for (const script of scripts) {
    graph.set(script.name, []);
  }

  // Build dependencies based on resources and dependencies arrays
  for (const script of scripts) {
    const dependencies: string[] = [];

    // Add explicit dependencies
    for (const dep of script.dependencies) {
      const dependentScript = scripts.find((s) => s.resources.includes(dep) || s.name === dep);
      if (dependentScript && dependentScript.name !== script.name) {
        dependencies.push(dependentScript.name);
      }
    }

    graph.set(script.name, dependencies);
  }

  return graph;
}

/**
 * Calculate date range for incremental collection
 */
async function calculateDateRange(
  db: PrismaClient,
  tenantId: string,
  dataSource: string,
  scriptName: string,
  importWindowDuration: number,
): Promise<{ startDate: Date; endDate: Date }> {
  // Check for existing run
  const lastRun = await db.dataSourceRun.findFirst({
    where: {
      tenantId,
      dataSource,
      script: scriptName,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  });

  const endDate = new Date();
  let startDate: Date;

  if (lastRun?.lastFetchedDataDate) {
    // Continue from where we left off
    startDate = new Date(lastRun.lastFetchedDataDate.getTime());
  } else {
    // Default to 90 days ago for first run
    startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  // Respect import window duration
  const maxStartDate = new Date(endDate.getTime() - importWindowDuration);
  if (startDate < maxStartDate) {
    startDate = maxStartDate;
  }

  return { startDate, endDate };
}

/**
 * Execute a single script with tracking and error handling
 */
async function executeScript(db: PrismaClient, script: DataSourceScript, tenantId: string, env: Record<string, string>): Promise<void> {
  try {
    // Check if we can acquire the lock
    const existingRuns = await db.dataSourceRun.findMany({
      where: {
        tenantId,
        dataSource: script.dataSource,
        script: script.scriptName,
      },
      take: 1,
    });

    // If there's an existing run that's still running, skip
    if (existingRuns.length > 0 && existingRuns[0].status === "RUNNING") {
      const runningTime = Date.now() - existingRuns[0].startedAt.getTime();
      // If it's been running for more than 1 hour, consider it stale
      if (runningTime < 60 * 60 * 1000) {
        console.log(`Script ${script.name} is already running for tenant ${tenantId}, skipping`);
        return;
      }
    }

    // Calculate date range
    const { startDate, endDate } = await calculateDateRange(db, tenantId, script.dataSource, script.scriptName, script.importWindowDuration);

    console.log(`Executing ${script.name} for tenant ${tenantId}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Create or update run record
    const runRecord = await db.dataSourceRun.upsert({
      where: {
        tenantId_dataSource_script: {
          tenantId,
          dataSource: script.dataSource,
          script: script.scriptName,
        },
      },
      update: {
        status: "RUNNING",
        startedAt: new Date(),
        completedAt: null,
        error: null,
      },
      create: {
        tenantId,
        dataSource: script.dataSource,
        script: script.scriptName,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    try {
      // Execute the script
      await script.run(env, db, tenantId, startDate, endDate);

      // Mark as completed
      await db.dataSourceRun.update({
        where: { id: runRecord.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          lastFetchedDataDate: endDate,
          error: null,
        },
      });

      console.log(`Completed ${script.name} for tenant ${tenantId}`);
    } catch (error) {
      // Mark as failed
      await db.dataSourceRun.update({
        where: { id: runRecord.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      });

      console.error(`Failed ${script.name} for tenant ${tenantId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Error executing script ${script.name} for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Execute scripts for a single tenant with dependency management
 */
async function executeForTenant(db: PrismaClient, tenantId: string, scripts: DataSourceScript[], env: Record<string, string>): Promise<void> {
  if (scripts.length === 0) {
    console.log(`No scripts to execute for tenant ${tenantId}`);
    return;
  }

  const dependencyGraph = buildDependencyGraph(scripts);
  const scriptMap = new Map(scripts.map((s) => [s.name, s]));

  console.log(`Executing ${scripts.length} scripts for tenant ${tenantId}`);
  console.log(`Dependency graph:`, Object.fromEntries(dependencyGraph));

  // Create execution graph using p-graph
  const nodeMap = new Map();
  const dependencies: Array<[string, string]> = [];

  // Build node map
  for (const name of Array.from(dependencyGraph.keys())) {
    nodeMap.set(name, {
      run: async () => {
        const script = scriptMap.get(name);
        if (!script) {
          throw new Error(`Script ${name} not found`);
        }
        await executeScript(db, script, tenantId, env);
      },
    });
  }

  // Build dependencies array
  for (const [name, deps] of Array.from(dependencyGraph.entries())) {
    for (const dep of deps) {
      dependencies.push([dep, name]); // dep must complete before name
    }
  }

  // Execute tasks in dependency order
  const graph = pGraph(nodeMap, dependencies);
  await graph.run();

  console.log(`All scripts executed successfully for tenant ${tenantId}`);
}

/**
 * Main import orchestrator function
 */
export async function runImport(): Promise<void> {
  console.log("Starting tenant-based data source import...");
  const startTime = Date.now();
  const db = prisma;

  try {
    // Step 1: Get tenant configurations
    const environments = await getTenantConfigurations(db);

    if (environments.length === 0) {
      console.log("No tenant data source configurations found");
      return;
    }

    console.log(`Found configurations for ${environments.length} tenant/data source combinations`);

    // Step 2: Get unique configured data sources
    const configuredDataSources = new Set(environments.map((e) => e.dataSource));
    console.log(`Configured data sources: ${Array.from(configuredDataSources).join(", ")}`);

    // Step 3: Load scripts for configured data sources
    const allScripts = await loadDataSourceScripts(configuredDataSources);

    if (allScripts.length === 0) {
      console.log("No data source scripts found");
      return;
    }

    console.log(`Loaded ${allScripts.length} scripts`);

    // Step 4: Group scripts by tenant and execute
    const tenantExecutions: Promise<void>[] = [];

    // Group environments by tenant
    const tenantGroups = new Map<string, TenantEnvironment[]>();
    for (const env of environments) {
      if (!tenantGroups.has(env.tenantId)) {
        tenantGroups.set(env.tenantId, []);
      }
      tenantGroups.get(env.tenantId)!.push(env);
    }

    // Execute for each tenant
    for (const [tenantId, tenantEnvs] of tenantGroups.entries()) {
      // Collect all scripts for this tenant
      const tenantScripts: DataSourceScript[] = [];
      const mergedEnv: Record<string, string> = {};

      for (const tenantEnv of tenantEnvs) {
        // Merge environment variables
        Object.assign(mergedEnv, tenantEnv.env);

        // Add scripts for this data source
        const dataSourceScripts = allScripts.filter((s) => s.dataSource === tenantEnv.dataSource);
        tenantScripts.push(...dataSourceScripts);
      }

      // Execute scripts for this tenant
      tenantExecutions.push(
        executeForTenant(db, tenantId, tenantScripts, mergedEnv).catch((error) => {
          console.error(`Failed to execute scripts for tenant ${tenantId}:`, error);
        }),
      );
    }

    // Wait for all tenant executions to complete
    await Promise.all(tenantExecutions);

    const duration = Date.now() - startTime;
    console.log(`Data source import completed in ${duration}ms`);
  } catch (error) {
    console.error("Fatal error during import:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// CLI execution for testing
if (typeof require !== "undefined" && require.main === module) {
  runImport().catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
}
