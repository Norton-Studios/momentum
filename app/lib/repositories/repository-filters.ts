import type { PrismaClient } from "@prisma/client";

export type ActivityStatus = "active" | "stale" | "inactive" | "all";

export interface RepositoryFilters {
  search?: string;
  languages?: string[];
  activity?: ActivityStatus;
  showArchived?: boolean;
  selectedOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export interface PaginatedRepositories {
  repositories: Array<{
    id: string;
    name: string;
    fullName: string;
    description: string | null;
    language: string | null;
    stars: number;
    isPrivate: boolean;
    isEnabled: boolean;
    lastSyncAt: Date | null;
  }>;
  totalCount: number;
  nextCursor?: string;
}

function getActivityFilter(activity: ActivityStatus) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  switch (activity) {
    case "active":
      return { lastSyncAt: { gte: thirtyDaysAgo } };
    case "stale":
      return {
        lastSyncAt: {
          gte: ninetyDaysAgo,
          lt: thirtyDaysAgo,
        },
      };
    case "inactive":
      return {
        OR: [{ lastSyncAt: { lt: ninetyDaysAgo } }, { lastSyncAt: null }],
      };
    default:
      return {};
  }
}

export async function getRepositoriesWithFilters(db: PrismaClient, dataSourceId: string, filters: RepositoryFilters = {}): Promise<PaginatedRepositories> {
  const { search, languages, activity = "all", cursor, limit = 100 } = filters;

  const where = {
    dataSourceId,
    isArchived: false,
    ...(search && {
      OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }],
    }),
    ...(languages &&
      languages.length > 0 && {
        language: { in: languages },
      }),
    ...getActivityFilter(activity),
    ...(cursor && { id: { gt: cursor } }),
  };

  const [repositories, totalCount] = await Promise.all([
    db.repository.findMany({
      where,
      select: {
        id: true,
        name: true,
        fullName: true,
        description: true,
        language: true,
        stars: true,
        isPrivate: true,
        isEnabled: true,
        lastSyncAt: true,
      },
      orderBy: { name: "asc" },
      take: limit + 1,
    }),
    db.repository.count({ where }),
  ]);

  const hasMore = repositories.length > limit;
  const resultRepositories = hasMore ? repositories.slice(0, limit) : repositories;
  const nextCursor = hasMore ? resultRepositories[resultRepositories.length - 1]?.id : undefined;

  return {
    repositories: resultRepositories,
    totalCount,
    nextCursor,
  };
}

export async function getUniqueLanguages(db: PrismaClient, dataSourceId: string): Promise<string[]> {
  const result = await db.repository.findMany({
    where: {
      dataSourceId,
      language: { not: null },
    },
    select: { language: true },
    distinct: ["language"],
    orderBy: { language: "asc" },
  });

  return result.map((r) => r.language).filter((lang): lang is string => lang !== null);
}

export async function bulkUpdateRepositorySelection(db: PrismaClient, repositoryIds: string[], isEnabled: boolean): Promise<number> {
  const result = await db.repository.updateMany({
    where: { id: { in: repositoryIds } },
    data: { isEnabled },
  });

  return result.count;
}

export async function selectAllMatchingFilters(db: PrismaClient, dataSourceId: string, filters: Omit<RepositoryFilters, "cursor" | "limit">, isEnabled: boolean): Promise<number> {
  const { search, languages, activity = "all" } = filters;

  const where = {
    dataSourceId,
    ...(search && {
      OR: [{ name: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }],
    }),
    ...(languages &&
      languages.length > 0 && {
        language: { in: languages },
      }),
    ...getActivityFilter(activity),
  };

  const result = await db.repository.updateMany({
    where,
    data: { isEnabled },
  });

  return result.count;
}
