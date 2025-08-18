import { prisma } from "@mmtm/database";
import { getTenantConfigurations } from "./lib/config/tenant-config";
import { loadDataSourceScripts } from "./lib/dependencies/loader";
import { executeForTenant } from "./lib/execution/tenant-executor";
import type { TenantEnvironment } from "./lib/config/tenant-config";
import type { DataSourceScript } from "./lib/dependencies/loader";

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
    tenantGroups.forEach((tenantEnvs, tenantId) => {
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
    });

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
