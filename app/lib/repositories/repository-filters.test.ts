import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", () => ({
  db: {
    repository: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { db } from "~/db.server";
import { bulkUpdateRepositorySelection, getRepositoriesWithFilters, getUniqueLanguages, selectAllMatchingFilters } from "./repository-filters";

describe("getRepositoriesWithFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns repositories with default filters", async () => {
    const mockRepos = [
      {
        id: "repo-1",
        name: "api",
        fullName: "org/api",
        description: "API service",
        language: "TypeScript",
        stars: 10,
        isPrivate: false,
        isEnabled: true,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: "GITHUB" as const,
        dataSourceId: "ds-1",
        url: "https://github.com/org/api",
        forks: 2,
        isArchived: false,
      },
      {
        id: "repo-2",
        name: "web",
        fullName: "org/web",
        description: "Web app",
        language: "JavaScript",
        stars: 5,
        isPrivate: false,
        isEnabled: false,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: "GITHUB" as const,
        dataSourceId: "ds-1",
        url: "https://github.com/org/web",
        forks: 1,
        isArchived: false,
      },
    ];
    vi.mocked(db.repository.findMany).mockResolvedValue(mockRepos);
    vi.mocked(db.repository.count).mockResolvedValue(2);

    const result = await getRepositoriesWithFilters(db, "ds-1");

    expect(result.repositories).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.nextCursor).toBeUndefined();
    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dataSourceId: "ds-1",
          isArchived: false,
        }),
        take: 101,
      })
    );
  });

  it("filters by search term across name and description", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { search: "api" });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ name: { contains: "api", mode: "insensitive" } }, { description: { contains: "api", mode: "insensitive" } }],
        }),
      })
    );
  });

  it("filters by languages", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { languages: ["TypeScript", "JavaScript"] });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          language: { in: ["TypeScript", "JavaScript"] },
        }),
      })
    );
  });

  it("filters by active activity status (last 30 days)", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { activity: "active" });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lastSyncAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      })
    );
  });

  it("filters by stale activity status (30-90 days)", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { activity: "stale" });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lastSyncAt: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
  });

  it("filters by inactive activity status (>90 days or null)", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { activity: "inactive" });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ lastSyncAt: expect.objectContaining({ lt: expect.any(Date) }) }, { lastSyncAt: null }],
        }),
      })
    );
  });

  it("uses cursor for pagination", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { cursor: "repo-50" });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { gt: "repo-50" },
        }),
      })
    );
  });

  it("returns nextCursor when there are more results", async () => {
    const mockRepos = Array.from({ length: 101 }, (_, i) => ({
      id: `repo-${i}`,
      name: `repo-${i}`,
      fullName: `org/repo-${i}`,
      description: null,
      language: "TypeScript",
      stars: 0,
      isPrivate: false,
      isEnabled: true,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: "GITHUB" as const,
      dataSourceId: "ds-1",
      url: `https://github.com/org/repo-${i}`,
      forks: 0,
      isArchived: false,
    }));
    vi.mocked(db.repository.findMany).mockResolvedValue(mockRepos);
    vi.mocked(db.repository.count).mockResolvedValue(150);

    const result = await getRepositoriesWithFilters(db, "ds-1", { limit: 100 });

    expect(result.repositories).toHaveLength(100);
    expect(result.nextCursor).toBe("repo-99");
    expect(result.totalCount).toBe(150);
  });

  it("respects custom limit", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);

    await getRepositoriesWithFilters(db, "ds-1", { limit: 50 });

    expect(db.repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
      })
    );
  });
});

describe("getUniqueLanguages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unique non-null languages sorted alphabetically", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([{ language: "Go" }, { language: "JavaScript" }, { language: "TypeScript" }] as never);

    const result = await getUniqueLanguages(db, "ds-1");

    expect(result).toEqual(["Go", "JavaScript", "TypeScript"]);
    expect(db.repository.findMany).toHaveBeenCalledWith({
      where: {
        dataSourceId: "ds-1",
        language: { not: null },
      },
      select: { language: true },
      distinct: ["language"],
      orderBy: { language: "asc" },
    });
  });

  it("returns empty array when no languages", async () => {
    vi.mocked(db.repository.findMany).mockResolvedValue([]);

    const result = await getUniqueLanguages(db, "ds-1");

    expect(result).toEqual([]);
  });
});

describe("bulkUpdateRepositorySelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enables multiple repositories", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 3 });

    const result = await bulkUpdateRepositorySelection(db, ["repo-1", "repo-2", "repo-3"], true);

    expect(result).toBe(3);
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1", "repo-2", "repo-3"] } },
      data: { isEnabled: true },
    });
  });

  it("disables multiple repositories", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 2 });

    const result = await bulkUpdateRepositorySelection(db, ["repo-1", "repo-2"], false);

    expect(result).toBe(2);
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1", "repo-2"] } },
      data: { isEnabled: false },
    });
  });
});

describe("selectAllMatchingFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates all repositories matching filters", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 25 });

    const result = await selectAllMatchingFilters(db, "ds-1", { search: "api", languages: ["TypeScript"], activity: "active" }, true);

    expect(result).toBe(25);
    expect(db.repository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dataSourceId: "ds-1",
          OR: [{ name: { contains: "api", mode: "insensitive" } }, { description: { contains: "api", mode: "insensitive" } }],
          language: { in: ["TypeScript"] },
        }),
        data: { isEnabled: true },
      })
    );
  });

  it("applies activity filter when selecting all", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 10 });

    await selectAllMatchingFilters(db, "ds-1", { activity: "inactive" }, false);

    expect(db.repository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ lastSyncAt: expect.objectContaining({ lt: expect.any(Date) }) }, { lastSyncAt: null }],
        }),
        data: { isEnabled: false },
      })
    );
  });

  it("works with no filters", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 100 });

    const result = await selectAllMatchingFilters(db, "ds-1", {}, true);

    expect(result).toBe(100);
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { dataSourceId: "ds-1" },
      data: { isEnabled: true },
    });
  });
});
