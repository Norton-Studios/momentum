import type { DbClient } from "~/db.server.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const INITIAL_WINDOW_DAYS = 7;
const BACKFILL_CHUNK_DAYS = 7;

export async function calculateDateRanges(db: DbClient, dataSourceId: string, scriptName: string, targetWindowDays: number): Promise<DateRanges> {
  const now = new Date();
  const targetBoundary = new Date(now.getTime() - targetWindowDays * DAY_MS);

  const lastRun = await db.dataSourceRun.findFirst({
    where: {
      dataSourceId,
      scriptName,
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
  });

  // First import: small window for fast onboarding
  if (!lastRun) {
    const startDate = new Date(now.getTime() - INITIAL_WINDOW_DAYS * DAY_MS);
    return {
      forward: { startDate, endDate: now },
      backfill: null,
      backfillComplete: false,
    };
  }

  // Forward sync: from lastFetchedDataAt to now
  const forwardRange = lastRun.lastFetchedDataAt ? { startDate: new Date(lastRun.lastFetchedDataAt), endDate: now } : null;

  // Calculate earliest fetched date for backfill tracking
  // If earliestFetchedDataAt is set, use it. Otherwise, estimate from initial window.
  const earliestFetched = lastRun.earliestFetchedDataAt
    ? new Date(lastRun.earliestFetchedDataAt)
    : lastRun.lastFetchedDataAt
      ? new Date(lastRun.lastFetchedDataAt.getTime() - INITIAL_WINDOW_DAYS * DAY_MS)
      : now;

  // Check if backfill is complete (we've reached the target boundary)
  if (earliestFetched <= targetBoundary) {
    return {
      forward: forwardRange,
      backfill: null,
      backfillComplete: true,
    };
  }

  // Calculate backfill chunk going backwards
  const backfillEnd = earliestFetched;
  const backfillStart = new Date(Math.max(backfillEnd.getTime() - BACKFILL_CHUNK_DAYS * DAY_MS, targetBoundary.getTime()));

  return {
    forward: forwardRange,
    backfill: { startDate: backfillStart, endDate: backfillEnd },
    backfillComplete: false,
  };
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRanges {
  forward: DateRange | null;
  backfill: DateRange | null;
  backfillComplete: boolean;
}
