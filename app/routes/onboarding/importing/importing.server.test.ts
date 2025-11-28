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
    dataSource: {
      findFirst: vi.fn(),
    },
    repository: {
      count: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { importingAction, importingLoader } from "./importing.server";

describe("importingLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  it("redirects to datasources when no VCS data source exists", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/onboarding/importing");
    const response = await importingLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/onboarding/datasources");
  });

  it("returns enabled repo count and message when data source exists", async () => {
    const mockDataSource = { id: "ds-1", provider: "GITHUB", isEnabled: true };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.count).mockResolvedValue(25);

    const request = new Request("http://localhost/onboarding/importing");
    const response = await importingLoader({ request, params: {}, context: {} });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabledRepos).toBe(25);
    expect(body.message).toContain("Import has been initiated");
  });

  it("queries correct VCS providers", async () => {
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/onboarding/importing");
    await importingLoader({ request, params: {}, context: {} });

    expect(db.dataSource.findFirst).toHaveBeenCalledWith({
      where: {
        provider: { in: ["GITHUB", "GITLAB", "BITBUCKET"] },
        isEnabled: true,
      },
    });
  });

  it("counts only enabled repositories for the data source", async () => {
    const mockDataSource = { id: "ds-1", provider: "GITHUB", isEnabled: true };
    vi.mocked(db.dataSource.findFirst).mockResolvedValue(mockDataSource as never);
    vi.mocked(db.repository.count).mockResolvedValue(10);

    const request = new Request("http://localhost/onboarding/importing");
    await importingLoader({ request, params: {}, context: {} });

    expect(db.repository.count).toHaveBeenCalledWith({
      where: {
        dataSourceId: "ds-1",
        isEnabled: true,
      },
    });
  });
});

describe("importingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ id: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" } as never);
  });

  describe("continue intent", () => {
    it("redirects to complete page", async () => {
      const formData = new FormData();
      formData.append("intent", "continue");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = await importingAction({ request, params: {}, context: {} });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/onboarding/complete");
    });
  });

  describe("invalid intent", () => {
    it("returns error for unknown intent", async () => {
      const formData = new FormData();
      formData.append("intent", "unknown");

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = await importingAction({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid intent");
    });

    it("returns error when no intent provided", async () => {
      const formData = new FormData();

      const request = new Request("http://localhost/onboarding/importing", {
        method: "POST",
        body: formData,
      });

      const response = await importingAction({ request, params: {}, context: {} });

      expect(response.status).toBe(400);
    });
  });
});
