import type { DbClient } from "~/db.server.js";

export async function calculateDateRange(db: DbClient, dataSourceId: string, scriptName: string, defaultWindowDays: number): Promise<{ startDate: Date; endDate: Date }> {
  const endDate = new Date();

  // Find last successful run with data
  const lastRun = await db.dataSourceRun.findFirst({
    where: {
      dataSourceId,
      scriptName,
      status: "COMPLETED",
      lastFetchedDataAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
  });

  // Use last fetched date, or default to window
  const startDate = lastRun?.lastFetchedDataAt ? new Date(lastRun.lastFetchedDataAt) : new Date(endDate.getTime() - defaultWindowDays * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
}
