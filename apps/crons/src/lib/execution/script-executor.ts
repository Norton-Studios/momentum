import type { PrismaClient } from "@mmtm/database";
import type { DataSourceScript } from "../dependencies/loader";
import { calculateDateRange } from "./date-range";

/**
 * Execute a single script with tracking and error handling
 */
export async function executeScript(db: PrismaClient, script: DataSourceScript, tenantId: string, env: Record<string, string>): Promise<void> {
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
