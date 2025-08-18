import type { PrismaClient } from "@mmtm/database";

/**
 * Calculate date range for incremental collection
 */
export async function calculateDateRange(
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
