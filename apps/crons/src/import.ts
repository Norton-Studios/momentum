import fg from "fast-glob";
import path from "node:path";
import pGraph from "p-graph";
import { prisma, type PrismaClient } from "@mmtm/database";

interface DataSource {
  name: string;
  resources: string[];
  dependencies: string[];
  run: (db: PrismaClient, startDate?: Date, endDate?: Date) => Promise<void>;
}

export async function loadDataSources(): Promise<DataSource[]> {
  const dataSourcePaths = await fg(["../../libs/plugins/data-sources/*/index.ts", "../../libs/plugins/data-sources/*/*.ts"], {
    absolute: true,
    cwd: __dirname,
  });

  const dataSources: DataSource[] = [];

  for (const dataSourcePath of dataSourcePaths) {
    try {
      const module = await import(dataSourcePath);

      if (module.resources && module.run) {
        const name = path.basename(dataSourcePath, ".ts");
        const parentDir = path.basename(path.dirname(dataSourcePath));
        const dataSourceName = name === "index" ? parentDir : `${parentDir}-${name}`;

        dataSources.push({
          name: dataSourceName,
          resources: module.resources || [],
          dependencies: module.dependencies || [],
          run: module.run,
        });

        console.log(`Loaded data source: ${dataSourceName}`);
      }
    } catch (error) {
      console.error(`Error loading data source from ${dataSourcePath}:`, error);
    }
  }

  return dataSources;
}

export function buildDependencyGraph(dataSources: DataSource[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  // Initialize graph with all data sources
  for (const dataSource of dataSources) {
    graph.set(dataSource.name, []);
  }

  // Build dependencies based on resources and dependencies arrays
  for (const dataSource of dataSources) {
    const dependencies: string[] = [];

    // Add explicit dependencies
    for (const dep of dataSource.dependencies) {
      const dependentDataSource = dataSources.find((ds) => ds.resources.includes(dep) || ds.name === dep);
      if (dependentDataSource && dependentDataSource.name !== dataSource.name) {
        dependencies.push(dependentDataSource.name);
      }
    }

    graph.set(dataSource.name, dependencies);
  }

  return graph;
}

export async function executeDataSources(dataSources: DataSource[], startDate?: Date, endDate?: Date): Promise<void> {
  const db = prisma;

  try {
    const dependencyGraph = buildDependencyGraph(dataSources);
    const dataSourceMap = new Map(dataSources.map((ds) => [ds.name, ds]));

    console.log("Dependency Graph:", Object.fromEntries(dependencyGraph));

    // Create execution graph using p-graph
    const nodeMap = new Map();
    const dependencies: Array<[string, string]> = [];

    // Build node map
    for (const name of Array.from(dependencyGraph.keys())) {
      nodeMap.set(name, {
        run: async () => {
          const dataSource = dataSourceMap.get(name);
          if (!dataSource) {
            throw new Error(`Data source ${name} not found`);
          }

          console.log(`Starting data source: ${name}`);

          // Record run start
          const runRecord = await db.dataSourceRun.create({
            data: {
              dataSource: name,
              status: "RUNNING",
              startedAt: new Date(),
            },
          });

          try {
            await dataSource.run(db, startDate, endDate);

            // Record successful completion
            await db.dataSourceRun.update({
              where: { id: runRecord.id },
              data: {
                status: "COMPLETED",
                completedAt: new Date(),
                lastFetchedDataDate: endDate || new Date(),
              },
            });

            console.log(`Completed data source: ${name}`);
          } catch (error) {
            // Record failure
            await db.dataSourceRun.update({
              where: { id: runRecord.id },
              data: {
                status: "FAILED",
                completedAt: new Date(),
                error: error instanceof Error ? error.message : String(error),
              },
            });

            console.error(`Failed data source: ${name}`, error);
            throw error;
          }
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

    console.log("All data sources executed successfully");
  } finally {
    await db.$disconnect();
  }
}

export async function runImport(startDate?: Date, endDate?: Date): Promise<void> {
  console.log("Starting data source import...");

  if (startDate) {
    console.log(`Import range: ${startDate.toISOString()} to ${endDate?.toISOString() || "now"}`);
  }

  const dataSources = await loadDataSources();

  if (dataSources.length === 0) {
    console.log("No data sources found");
    return;
  }

  console.log(`Found ${dataSources.length} data sources`);
  await executeDataSources(dataSources, startDate, endDate);
}

// CLI execution
if (typeof require !== "undefined" && require.main === module) {
  const args = process.argv.slice(2);
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (args.length >= 1) {
    startDate = new Date(args[0]);
  }
  if (args.length >= 2) {
    endDate = new Date(args[1]);
  }

  runImport(startDate, endDate).catch(console.error);
}
