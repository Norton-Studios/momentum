import type { PrismaClient } from "@prisma/client";
import type { DataSourceScriptMap } from "../orchestrator/script-loader.js";
import type { ScriptExecutionResult, ScriptError } from "../orchestrator/runner.js";
import { executeScript } from "./execute-script";
import { PGraph } from "p-graph/lib/PGraph.js";

export function buildExecutionGraph(
  db: PrismaClient,
  dataSources: DataSourceScriptMap,
  executionResults: Map<string, ScriptExecutionResult>,
  errors: Array<ScriptError>,
  batchId: string
): PGraph {
  const nodeMap = new Map<string, { run: () => Promise<void> }>();
  const dependencies: [string, string][] = [];

  for (const [script, executionContext] of dataSources.entries()) {
    const nodeId = buildNodeId(executionContext.dataSourceId, script.resource);
    const run = async () => {
      const result = await executeScript(db, executionContext, script, batchId);
      executionResults.set(nodeId, result);
      if (!result.success && result.error) {
        errors.push({ script: `${executionContext.dataSourceName}:${script.resource}`, error: result.error });
      }
    };

    nodeMap.set(nodeId, { run });

    for (const dep of script.dependsOn) {
      const depNodeId = buildNodeId(executionContext.dataSourceId, dep);
      dependencies.push([depNodeId, nodeId]);
    }
  }

  return new PGraph(nodeMap, dependencies);
}

function buildNodeId(dataSourceId: string, resource: string): string {
  return `${dataSourceId}:${resource}`;
}
