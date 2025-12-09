import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", () => ({
  db: {
    repository: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { db } from "~/db.server";
import { DEFAULT_ACTIVE_THRESHOLD_DAYS, REPOSITORY_PAGE_SIZE, toggleRepositoriesBatch, toggleRepository } from "./toggle-repositories";

describe("toggleRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when repositoryId is empty", async () => {
    await expect(toggleRepository(db, "", true)).rejects.toThrow("Repository ID is required");
    expect(db.repository.findUnique).not.toHaveBeenCalled();
  });

  it("throws error when repository is not found", async () => {
    vi.mocked(db.repository.findUnique).mockResolvedValue(null);

    await expect(toggleRepository(db, "repo-1", true)).rejects.toThrow("Repository not found");
    expect(db.repository.findUnique).toHaveBeenCalledWith({
      where: { id: "repo-1" },
    });
    expect(db.repository.update).not.toHaveBeenCalled();
  });

  it("enables repository when found", async () => {
    const mockRepo = { id: "repo-1", name: "test-repo", isEnabled: false };
    vi.mocked(db.repository.findUnique).mockResolvedValue(mockRepo as never);
    vi.mocked(db.repository.update).mockResolvedValue({ ...mockRepo, isEnabled: true } as never);

    const result = await toggleRepository(db, "repo-1", true);

    expect(db.repository.findUnique).toHaveBeenCalledWith({
      where: { id: "repo-1" },
    });
    expect(db.repository.update).toHaveBeenCalledWith({
      where: { id: "repo-1" },
      data: { isEnabled: true },
    });
    expect(result.isEnabled).toBe(true);
  });

  it("disables repository when found", async () => {
    const mockRepo = { id: "repo-1", name: "test-repo", isEnabled: true };
    vi.mocked(db.repository.findUnique).mockResolvedValue(mockRepo as never);
    vi.mocked(db.repository.update).mockResolvedValue({ ...mockRepo, isEnabled: false } as never);

    const result = await toggleRepository(db, "repo-1", false);

    expect(db.repository.update).toHaveBeenCalledWith({
      where: { id: "repo-1" },
      data: { isEnabled: false },
    });
    expect(result.isEnabled).toBe(false);
  });
});

describe("toggleRepositoriesBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns count 0 when repositoryIds array is empty", async () => {
    const result = await toggleRepositoriesBatch(db, [], true);

    expect(result).toEqual({ count: 0 });
    expect(db.repository.updateMany).not.toHaveBeenCalled();
  });

  it("enables multiple repositories", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 3 });

    const result = await toggleRepositoriesBatch(db, ["repo-1", "repo-2", "repo-3"], true);

    expect(result).toEqual({ count: 3 });
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1", "repo-2", "repo-3"] } },
      data: { isEnabled: true },
    });
  });

  it("disables multiple repositories", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 2 });

    const result = await toggleRepositoriesBatch(db, ["repo-1", "repo-2"], false);

    expect(result).toEqual({ count: 2 });
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1", "repo-2"] } },
      data: { isEnabled: false },
    });
  });

  it("handles single repository in batch", async () => {
    vi.mocked(db.repository.updateMany).mockResolvedValue({ count: 1 });

    const result = await toggleRepositoriesBatch(db, ["repo-1"], true);

    expect(result).toEqual({ count: 1 });
    expect(db.repository.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["repo-1"] } },
      data: { isEnabled: true },
    });
  });
});

describe("constants", () => {
  it("exports DEFAULT_ACTIVE_THRESHOLD_DAYS as 90", () => {
    expect(DEFAULT_ACTIVE_THRESHOLD_DAYS).toBe(90);
  });

  it("exports REPOSITORY_PAGE_SIZE as 100", () => {
    expect(REPOSITORY_PAGE_SIZE).toBe(100);
  });
});
