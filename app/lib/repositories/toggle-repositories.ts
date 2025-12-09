import type { PrismaClient } from "@prisma/client";

export async function toggleRepository(db: PrismaClient, repositoryId: string, isEnabled: boolean) {
  if (!repositoryId) {
    throw new Error("Repository ID is required");
  }

  const repository = await db.repository.findUnique({
    where: { id: repositoryId },
  });

  if (!repository) {
    throw new Error("Repository not found");
  }

  return db.repository.update({
    where: { id: repositoryId },
    data: { isEnabled },
  });
}

export async function toggleRepositoriesBatch(db: PrismaClient, repositoryIds: string[], isEnabled: boolean) {
  if (repositoryIds.length === 0) {
    return { count: 0 };
  }

  const result = await db.repository.updateMany({
    where: { id: { in: repositoryIds } },
    data: { isEnabled },
  });

  return { count: result.count };
}

// Default repositories to enabled if they've been active within this threshold
export const DEFAULT_ACTIVE_THRESHOLD_DAYS = 90;

// Default page size for repository lists
export const REPOSITORY_PAGE_SIZE = 100;
