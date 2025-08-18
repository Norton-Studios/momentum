import fg from "fast-glob";
import path from "node:path";
import type { PrismaClient } from "@mmtm/database";

export interface DataSourceScript {
  name: string;
  dataSource: string;
  scriptName: string;
  resources: string[];
  dependencies: string[];
  importWindowDuration: number;
  run: (env: Record<string, string>, db: PrismaClient, tenantId: string, startDate: Date, endDate: Date) => Promise<void>;
}

/**
 * Scan and load data source plugins that match configured data sources
 */
export async function loadDataSourceScripts(configuredDataSources: Set<string>): Promise<DataSourceScript[]> {
  const scripts: DataSourceScript[] = [];

  for (const dataSource of Array.from(configuredDataSources)) {
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
