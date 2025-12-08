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
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    organization: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dataSource: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dataSourceConfig: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(),
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { datasourcesAction, extractConfigsFromForm } from "./datasources.server";

describe("extractConfigsFromForm", () => {
  it("extracts GitHub config fields from FormData", () => {
    const formData = new FormData();
    formData.append("GITHUB_TOKEN", "ghp_test123");
    formData.append("GITHUB_ORG", "my-org");

    const result = extractConfigsFromForm(formData, "github");

    expect(result).toEqual({
      GITHUB_TOKEN: "ghp_test123",
      GITHUB_ORG: "my-org",
    });
  });

  it("ignores empty values", () => {
    const formData = new FormData();
    formData.append("GITHUB_TOKEN", "ghp_test123");
    formData.append("GITHUB_ORG", "");

    const result = extractConfigsFromForm(formData, "github");

    expect(result).toEqual({
      GITHUB_TOKEN: "ghp_test123",
    });
  });

  it("returns empty object for unknown provider", () => {
    const formData = new FormData();
    const result = extractConfigsFromForm(formData, "unknown");
    expect(result).toEqual({});
  });
});

describe("datasourcesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "test@example.com", name: "Test User", role: "ADMIN" } as never);
  });

  describe("connect intent", () => {
    it("creates organization and data source with config", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue(null);
      vi.mocked(db.organization.create).mockResolvedValue({ id: "org-1", name: "default", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);
      vi.mocked(db.dataSource.create).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      await datasourcesAction({ request, params: {}, context: {} } as never);

      expect(db.organization.create).toHaveBeenCalled();
      expect(db.dataSource.create).toHaveBeenCalled();
      expect(db.dataSourceConfig.upsert).toHaveBeenCalledTimes(2);
    });

    it("updates existing data source", async () => {
      vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1", onboardingCompletedAt: null } as never);
      vi.mocked(db.dataSource.findFirst).mockResolvedValue({ id: "ds-1" } as never);

      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      formData.append("GITHUB_ORG", "my-org");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      await datasourcesAction({ request, params: {}, context: {} } as never);

      expect(db.dataSource.update).toHaveBeenCalled();
      expect(db.dataSource.create).not.toHaveBeenCalled();
    });

    it("validates required fields", async () => {
      const formData = new FormData();
      formData.append("intent", "connect");
      formData.append("provider", "github");
      formData.append("GITHUB_TOKEN", "ghp_test123");
      // Missing GITHUB_ORG

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(400);
      expect(db.dataSource.create).not.toHaveBeenCalled();
    });
  });

  describe("continue intent", () => {
    it("redirects to importing page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/datasources", {
        method: "POST",
        body: formData,
      });

      const response = (await datasourcesAction({ request, params: {}, context: {} } as never)) as unknown as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/onboarding/importing");
    });
  });
});
