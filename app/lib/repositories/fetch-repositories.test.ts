import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGithubRepositories, fetchGitlabRepositories, saveRepositories } from "./fetch-repositories";

const mockPaginateIterator = vi.fn();
const mockGitlabProjectsAll = vi.fn();

vi.mock("@octokit/rest", () => ({
  Octokit: class MockOctokit {
    paginate = { iterator: mockPaginateIterator };
    repos = { listForOrg: vi.fn() };
  },
}));

vi.mock("@gitbeaker/rest", () => ({
  Gitlab: class MockGitlab {
    Projects = { all: mockGitlabProjectsAll };
  },
}));

describe("fetchGithubRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when organization is not provided", async () => {
    await expect(fetchGithubRepositories({ token: "test-token" })).rejects.toThrow("Organization is required for GitHub");
  });

  it("fetches and transforms repositories from GitHub", async () => {
    const mockRepos = [
      {
        name: "api",
        full_name: "org/api",
        description: "API service",
        html_url: "https://github.com/org/api",
        language: "TypeScript",
        stargazers_count: 10,
        forks_count: 2,
        private: false,
        archived: false,
        pushed_at: "2024-01-15T10:00:00Z",
      },
      {
        name: "web",
        full_name: "org/web",
        description: null,
        html_url: "https://github.com/org/web",
        language: null,
        stargazers_count: undefined,
        forks_count: undefined,
        private: true,
        archived: true,
        pushed_at: null,
      },
    ];

    mockPaginateIterator.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { data: mockRepos };
      },
    });

    const result = await fetchGithubRepositories({ token: "test-token", organization: "org" });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "api",
      fullName: "org/api",
      description: "API service",
      url: "https://github.com/org/api",
      language: "TypeScript",
      stars: 10,
      forks: 2,
      isPrivate: false,
      isArchived: false,
      pushedAt: new Date("2024-01-15T10:00:00Z"),
    });
    expect(result[1]).toEqual({
      name: "web",
      fullName: "org/web",
      description: null,
      url: "https://github.com/org/web",
      language: null,
      stars: 0,
      forks: 0,
      isPrivate: true,
      isArchived: true,
      pushedAt: null,
    });
  });

  it("handles multiple pages of results", async () => {
    const page1 = [
      { name: "repo-1", full_name: "org/repo-1", description: null, html_url: "https://github.com/org/repo-1", language: null, private: false, archived: false, pushed_at: null },
    ];
    const page2 = [
      { name: "repo-2", full_name: "org/repo-2", description: null, html_url: "https://github.com/org/repo-2", language: null, private: false, archived: false, pushed_at: null },
    ];

    mockPaginateIterator.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { data: page1 };
        yield { data: page2 };
      },
    });

    const result = await fetchGithubRepositories({ token: "test-token", organization: "org" });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("repo-1");
    expect(result[1].name).toBe("repo-2");
  });

  it("returns empty array when no repositories", async () => {
    mockPaginateIterator.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { data: [] };
      },
    });

    const result = await fetchGithubRepositories({ token: "my-secret-token", organization: "org" });

    expect(result).toEqual([]);
  });
});

describe("fetchGitlabRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and transforms repositories from GitLab", async () => {
    const mockProjects = [
      {
        id: 1,
        name: "project1",
        path_with_namespace: "group/project1",
        description: "Test project",
        web_url: "https://gitlab.com/group/project1",
        star_count: 5,
        forks_count: 1,
        visibility: "public",
        archived: false,
        last_activity_at: "2024-01-15T00:00:00Z",
      },
      {
        id: 2,
        name: "project2",
        path_with_namespace: "group/project2",
        description: null,
        web_url: "https://gitlab.com/group/project2",
        star_count: 0,
        forks_count: 0,
        visibility: "private",
        archived: true,
        last_activity_at: null,
      },
    ];

    mockGitlabProjectsAll.mockResolvedValue(mockProjects);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "project1",
      fullName: "group/project1",
      description: "Test project",
      url: "https://gitlab.com/group/project1",
      language: null,
      stars: 5,
      forks: 1,
      isPrivate: false,
      isArchived: false,
      pushedAt: new Date("2024-01-15T00:00:00Z"),
    });
    expect(result[1]).toEqual({
      name: "project2",
      fullName: "group/project2",
      description: null,
      url: "https://gitlab.com/group/project2",
      language: null,
      stars: 0,
      forks: 0,
      isPrivate: true,
      isArchived: true,
      pushedAt: null,
    });
  });

  it("skips projects without path_with_namespace", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockProjects = [
      {
        id: 1,
        name: "valid-project",
        path_with_namespace: "group/valid-project",
        description: null,
        web_url: "https://gitlab.com/group/valid-project",
        star_count: 0,
        forks_count: 0,
        visibility: "public",
        archived: false,
        last_activity_at: null,
      },
      {
        id: 2,
        name: "invalid-project",
        path_with_namespace: undefined,
        path: undefined,
        description: null,
        web_url: undefined,
        star_count: 0,
        forks_count: 0,
        visibility: "public",
        archived: false,
        last_activity_at: null,
      },
    ];

    mockGitlabProjectsAll.mockResolvedValue(mockProjects);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("group/valid-project");
    expect(consoleSpy).toHaveBeenCalledWith("[GitLab] Skipping project 2 - missing path_with_namespace");
    consoleSpy.mockRestore();
  });

  it("uses fallback path when path_with_namespace is missing but path exists", async () => {
    const mockProjects = [
      {
        id: 1,
        name: "project-with-path",
        path_with_namespace: undefined,
        path: "project-with-path",
        description: null,
        web_url: undefined,
        star_count: 0,
        forks_count: 0,
        visibility: "public",
        archived: false,
        last_activity_at: null,
      },
    ];

    mockGitlabProjectsAll.mockResolvedValue(mockProjects);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("project-with-path");
    expect(result[0].url).toBe("https://gitlab.com/project-with-path");
  });

  it("handles missing star_count and forks_count", async () => {
    const mockProjects = [
      {
        id: 1,
        name: "project",
        path_with_namespace: "group/project",
        description: null,
        web_url: "https://gitlab.com/group/project",
        star_count: undefined,
        forks_count: undefined,
        visibility: "public",
        archived: undefined,
        last_activity_at: null,
      },
    ];

    mockGitlabProjectsAll.mockResolvedValue(mockProjects);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result[0].stars).toBe(0);
    expect(result[0].forks).toBe(0);
    expect(result[0].isArchived).toBe(false);
  });

  it("generates name from fullName when name is missing", async () => {
    const mockProjects = [
      {
        id: 1,
        name: undefined,
        path_with_namespace: "group/subgroup/project",
        description: null,
        web_url: "https://gitlab.com/group/subgroup/project",
        star_count: 0,
        forks_count: 0,
        visibility: "public",
        archived: false,
        last_activity_at: null,
      },
    ];

    mockGitlabProjectsAll.mockResolvedValue(mockProjects);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result[0].name).toBe("project");
  });

  it("returns empty array when no projects", async () => {
    mockGitlabProjectsAll.mockResolvedValue([]);

    const result = await fetchGitlabRepositories({ token: "test-token" });

    expect(result).toEqual([]);
  });
});

describe("saveRepositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts repositories to database", async () => {
    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const repositories = [
      {
        name: "api",
        fullName: "org/api",
        description: "API service",
        url: "https://github.com/org/api",
        language: "TypeScript",
        stars: 10,
        forks: 2,
        isPrivate: false,
        isArchived: false,
        pushedAt: new Date("2024-01-15T10:00:00Z"),
      },
    ];

    await saveRepositories(mockDb as never, "ds-1", repositories, "GITHUB");

    expect(mockDb.repository.upsert).toHaveBeenCalledWith({
      where: { fullName: "org/api" },
      create: {
        dataSourceId: "ds-1",
        name: "api",
        fullName: "org/api",
        description: "API service",
        provider: "GITHUB",
        url: "https://github.com/org/api",
        language: "TypeScript",
        stars: 10,
        forks: 2,
        isPrivate: false,
        isArchived: false,
        isEnabled: true,
        lastSyncAt: new Date("2024-01-15T10:00:00Z"),
      },
      update: {
        description: "API service",
        language: "TypeScript",
        stars: 10,
        forks: 2,
        isArchived: false,
        lastSyncAt: new Date("2024-01-15T10:00:00Z"),
      },
    });
  });

  it("sets isEnabled to false for archived repositories", async () => {
    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const repositories = [
      {
        name: "old-repo",
        fullName: "org/old-repo",
        description: null,
        url: "https://github.com/org/old-repo",
        language: null,
        stars: 0,
        forks: 0,
        isPrivate: false,
        isArchived: true,
        pushedAt: null,
      },
    ];

    await saveRepositories(mockDb as never, "ds-1", repositories);

    expect(mockDb.repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isEnabled: false,
          isArchived: true,
        }),
      })
    );
  });

  it("defaults provider to GITHUB", async () => {
    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const repositories = [
      {
        name: "repo",
        fullName: "org/repo",
        description: null,
        url: "https://github.com/org/repo",
        language: null,
        stars: 0,
        forks: 0,
        isPrivate: false,
        isArchived: false,
        pushedAt: null,
      },
    ];

    await saveRepositories(mockDb as never, "ds-1", repositories);

    expect(mockDb.repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider: "GITHUB",
        }),
      })
    );
  });

  it("handles multiple repositories concurrently", async () => {
    const mockDb = {
      repository: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    const repositories = [
      {
        name: "repo-1",
        fullName: "org/repo-1",
        description: null,
        url: "https://github.com/org/repo-1",
        language: null,
        stars: 0,
        forks: 0,
        isPrivate: false,
        isArchived: false,
        pushedAt: null,
      },
      {
        name: "repo-2",
        fullName: "org/repo-2",
        description: null,
        url: "https://github.com/org/repo-2",
        language: null,
        stars: 0,
        forks: 0,
        isPrivate: false,
        isArchived: false,
        pushedAt: null,
      },
      {
        name: "repo-3",
        fullName: "org/repo-3",
        description: null,
        url: "https://github.com/org/repo-3",
        language: null,
        stars: 0,
        forks: 0,
        isPrivate: false,
        isArchived: false,
        pushedAt: null,
      },
    ];

    await saveRepositories(mockDb as never, "ds-1", repositories, "GITLAB");

    expect(mockDb.repository.upsert).toHaveBeenCalledTimes(3);
  });
});
