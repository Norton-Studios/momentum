import { describe, it, expect, vi } from "vitest";
import { run } from "./repository";

const mockDb = {
  repository: {
    upsert: vi.fn(),
  },
};

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(() => ({
    repos: {
      listForAuthenticatedUser: vi.fn(() =>
        Promise.resolve({
          data: [
            {
              id: 1,
              name: "test-repo",
              description: "A test repository",
              owner: { login: "test-owner" },
              html_url: "https://github.com/test-owner/test-repo",
              language: "TypeScript",
              private: false,
              stargazers_count: 10,
              forks_count: 5,
              open_issues_count: 2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        }),
      ),
    },
  })),
}));

describe("GitHub Repository Data Source", () => {
  it("should fetch repositories and upsert them into the database", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");
    const tenantId = "test-tenant-id";

    await run(mockDb as any, startDate, endDate, tenantId);

    expect(mockDb.repository.upsert).toHaveBeenCalledOnce();
    const upsertArg = mockDb.repository.upsert.mock.calls[0][0];

    expect(upsertArg.where.externalId).toBe("1");
    expect(upsertArg.create.name).toBe("test-repo");
    expect(upsertArg.create.owner).toBe("test-owner");
    expect(upsertArg.create.tenantId).toBe("test-tenant-id");
  });
});
