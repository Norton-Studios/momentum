import type { DataSourceScript } from "./loader";

/**
 * Build dependency graph for scripts
 */
export function buildDependencyGraph(scripts: DataSourceScript[]): Map<string, string[]> {
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
