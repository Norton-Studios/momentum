import pGraph from "p-graph";
import type { PrismaClient } from "@mmtm/database";
import type { DataSourceScript } from "../dependencies/loader";
import { buildDependencyGraph } from "../dependencies/dependency-graph";
import { executeScript } from "./script-executor";

/**
 * Execute scripts for a single tenant with dependency management
 */
export async function executeForTenant(db: PrismaClient, tenantId: string, scripts: DataSourceScript[], env: Record<string, string>): Promise<void> {
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
