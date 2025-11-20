import { runOrchestrator } from "@crons/orchestrator/index.js";
import cron from "node-cron";

export interface SchedulerConfig {
  cronExpression: string;
}

export function startScheduler(config: SchedulerConfig = { cronExpression: "*/15 * * * *" }): void {
  console.log(`Starting scheduler: ${config.cronExpression}`);

  cron.schedule(config.cronExpression, async () => {
    console.log("Running orchestrator...");
    try {
      await runOrchestrator();
      console.log("Orchestrator completed");
    } catch (error) {
      console.error("Orchestrator failed:", error);
    }
  });
}
