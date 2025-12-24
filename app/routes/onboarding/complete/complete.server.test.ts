import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    organization: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    dataSource: {
      findMany: vi.fn(),
    },
    repository: {
      count: vi.fn(),
    },
    commit: {
      count: vi.fn(),
    },
    pullRequest: {
      count: vi.fn(),
    },
    contributor: {
      count: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { completeLoader } from "./complete.server";

describe("completeLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("redirects to datasources when no organization exists", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/onboarding/complete");
    const response = (await completeLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/onboarding/data-sources");
  });

  it("marks onboarding as completed", async () => {
    const mockOrg = { id: "org-1", name: "default", displayName: "My Org", onboardingCompletedAt: null };
    vi.mocked(db.organization.findFirst).mockResolvedValue(mockOrg as never);
    vi.mocked(db.organization.update).mockResolvedValue({ ...mockOrg, onboardingCompletedAt: new Date() } as never);
    vi.mocked(db.dataSource.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.count).mockResolvedValue(100);
    vi.mocked(db.pullRequest.count).mockResolvedValue(50);
    vi.mocked(db.contributor.count).mockResolvedValue(5);

    const request = new Request("http://localhost/onboarding/complete");
    await completeLoader({ request, params: {}, context: {} } as never);

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
  });

  it("returns organization and summary data", async () => {
    const mockOrg = { id: "org-1", name: "default", displayName: "My Org", onboardingCompletedAt: null };
    vi.mocked(db.organization.findFirst).mockResolvedValue(mockOrg as never);
    vi.mocked(db.organization.update).mockResolvedValue({ ...mockOrg, onboardingCompletedAt: new Date() } as never);
    vi.mocked(db.dataSource.findMany).mockResolvedValue([{ id: "ds-1", provider: "GITHUB", name: "GitHub", configs: [{ key: "GITHUB_ORG", value: "my-org" }] }] as never);
    vi.mocked(db.repository.count).mockResolvedValue(10);
    vi.mocked(db.commit.count).mockResolvedValue(100);
    vi.mocked(db.pullRequest.count).mockResolvedValue(50);
    vi.mocked(db.contributor.count).mockResolvedValue(5);

    const request = new Request("http://localhost/onboarding/complete");
    const response = (await completeLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.organization.name).toBe("My Org");
    expect(body.summary).toEqual({
      repositories: 10,
      commits: 100,
      pullRequests: 50,
      contributors: 5,
    });
    expect(body.dataSources).toHaveLength(1);
    expect(body.dataSources[0]).toEqual({
      provider: "GITHUB",
      name: "my-org",
    });
  });

  it("falls back to organization name when displayName is null", async () => {
    const mockOrg = { id: "org-1", name: "default-org", displayName: null, onboardingCompletedAt: null };
    vi.mocked(db.organization.findFirst).mockResolvedValue(mockOrg as never);
    vi.mocked(db.organization.update).mockResolvedValue({ ...mockOrg, onboardingCompletedAt: new Date() } as never);
    vi.mocked(db.dataSource.findMany).mockResolvedValue([]);
    vi.mocked(db.repository.count).mockResolvedValue(0);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.contributor.count).mockResolvedValue(0);

    const request = new Request("http://localhost/onboarding/complete");
    const response = (await completeLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    expect(body.organization.name).toBe("default-org");
  });

  it("extracts data source name from different config keys", async () => {
    const mockOrg = { id: "org-1", name: "default", displayName: "Org", onboardingCompletedAt: null };
    vi.mocked(db.organization.findFirst).mockResolvedValue(mockOrg as never);
    vi.mocked(db.organization.update).mockResolvedValue({ ...mockOrg, onboardingCompletedAt: new Date() } as never);
    vi.mocked(db.dataSource.findMany).mockResolvedValue([
      { id: "ds-1", provider: "GITHUB", name: "GitHub DS", configs: [{ key: "GITHUB_ORG", value: "github-org" }] },
      { id: "ds-2", provider: "GITLAB", name: "GitLab DS", configs: [{ key: "GITLAB_GROUP", value: "gitlab-group" }] },
      { id: "ds-3", provider: "BITBUCKET", name: "Bitbucket DS", configs: [{ key: "BITBUCKET_WORKSPACE", value: "bb-workspace" }] },
    ] as never);
    vi.mocked(db.repository.count).mockResolvedValue(0);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.contributor.count).mockResolvedValue(0);

    const request = new Request("http://localhost/onboarding/complete");
    const response = (await completeLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    expect(body.dataSources).toEqual([
      { provider: "GITHUB", name: "github-org" },
      { provider: "GITLAB", name: "gitlab-group" },
      { provider: "BITBUCKET", name: "bb-workspace" },
    ]);
  });

  it("uses data source name as fallback when no config found", async () => {
    const mockOrg = { id: "org-1", name: "default", displayName: "Org", onboardingCompletedAt: null };
    vi.mocked(db.organization.findFirst).mockResolvedValue(mockOrg as never);
    vi.mocked(db.organization.update).mockResolvedValue({ ...mockOrg, onboardingCompletedAt: new Date() } as never);
    vi.mocked(db.dataSource.findMany).mockResolvedValue([{ id: "ds-1", provider: "GITHUB", name: "Fallback Name", configs: [] }] as never);
    vi.mocked(db.repository.count).mockResolvedValue(0);
    vi.mocked(db.commit.count).mockResolvedValue(0);
    vi.mocked(db.pullRequest.count).mockResolvedValue(0);
    vi.mocked(db.contributor.count).mockResolvedValue(0);

    const request = new Request("http://localhost/onboarding/complete");
    const response = (await completeLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    const body = await response.json();
    expect(body.dataSources[0].name).toBe("Fallback Name");
  });
});
