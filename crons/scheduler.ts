import cron from "node-cron";
import type { PrismaClient } from "./db.ts";
import { runOrchestrator } from "./orchestrator/runner.js";

const DEFAULT_CRON_EXPRESSION = "*/15 * * * *";

export function startScheduler(db: PrismaClient, config: SchedulerConfig = {}): void {
  const cronExpression = config.cronExpression ?? DEFAULT_CRON_EXPRESSION;
  console.log(`Starting scheduler: ${cronExpression}`);

  cron.schedule(cronExpression, async () => {
    console.log("Running orchestrator...");
    try {
      const result = await runOrchestrator(db, { triggeredBy: "scheduler" });
      console.log(
        `Orchestrator completed: batch=${result.batchId}, ${result.scriptsExecuted} executed, ${result.scriptsFailed} failed, ${result.scriptsSkipped} skipped (${result.executionTimeMs}ms)`
      );
      if (result.errors.length > 0) {
        console.error(`Errors: ${result.errors.map((e) => `${e.script}: ${e.error}`).join(", ")}`);
      }
    } catch (error) {
      console.error("Orchestrator failed:", error);
    }
  });
}

export interface SchedulerConfig {
  cronExpression?: string;
}
