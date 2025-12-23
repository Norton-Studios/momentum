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
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { settingsAction, settingsLoader } from "./settings.server";

describe("settingsLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("requires admin authentication", async () => {
    const request = new Request("http://localhost/settings");
    vi.mocked(requireAdmin).mockRejectedValue(new Response(null, { status: 302 }));

    await expect(settingsLoader({ request, params: {}, context: {} } as never)).rejects.toThrow();
    expect(requireAdmin).toHaveBeenCalledWith(request);
  });

  it("returns organization data for authenticated admin", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({
      id: "org-1",
      name: "Test Org",
      displayName: "Test Organization",
      description: "Test description",
      website: "https://test.com",
      logoUrl: "https://test.com/logo.png",
    } as never);

    const request = new Request("http://localhost/settings");
    const response = (await settingsLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.organization).toEqual({
      id: "org-1",
      name: "Test Org",
      displayName: "Test Organization",
      description: "Test description",
      website: "https://test.com",
      logoUrl: "https://test.com/logo.png",
    });
  });

  it("returns error when organization not found", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue(null);

    const request = new Request("http://localhost/settings");
    const response = (await settingsLoader({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Organization not found");
  });
});

describe("settingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("requires admin authentication", async () => {
    const formData = new FormData();
    formData.append("intent", "update-organization");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    vi.mocked(requireAdmin).mockRejectedValue(new Response(null, { status: 302 }));

    await expect(settingsAction({ request, params: {}, context: {} } as never)).rejects.toThrow();
    expect(requireAdmin).toHaveBeenCalledWith(request);
  });

  it("returns error for invalid intent", async () => {
    const formData = new FormData();
    formData.append("intent", "invalid-intent");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid action");
  });

  it("validates required name field", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1" } as never);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("name");
  });

  it("validates website URL format", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1" } as never);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "Test Org");
    formData.append("website", "not-a-url");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("website");
  });

  it("validates logoUrl URL format", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1" } as never);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "Test Org");
    formData.append("logoUrl", "not-a-url");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toHaveProperty("logoUrl");
  });

  it("successfully updates organization with all fields", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1" } as never);
    vi.mocked(db.organization.update).mockResolvedValue({
      id: "org-1",
      name: "New Name",
      displayName: "New Display Name",
      description: "New description",
      website: "https://newwebsite.com",
      logoUrl: "https://newwebsite.com/logo.png",
    } as never);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "New Name");
    formData.append("displayName", "New Display Name");
    formData.append("description", "New description");
    formData.append("website", "https://newwebsite.com");
    formData.append("logoUrl", "https://newwebsite.com/logo.png");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        name: "New Name",
        displayName: "New Display Name",
        description: "New description",
        website: "https://newwebsite.com",
        logoUrl: "https://newwebsite.com/logo.png",
      },
    });
  });

  it("successfully updates organization with only required fields", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({ id: "org-1" } as never);
    vi.mocked(db.organization.update).mockResolvedValue({
      id: "org-1",
      name: "New Name",
      displayName: null,
      description: null,
      website: null,
      logoUrl: null,
    } as never);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "New Name");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    expect(db.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: {
        name: "New Name",
        displayName: null,
        description: null,
        website: null,
        logoUrl: null,
      },
    });
  });

  it("returns error when organization not found", async () => {
    vi.mocked(db.organization.findFirst).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("intent", "update-organization");
    formData.append("name", "Test Org");
    const request = new Request("http://localhost/settings", { method: "POST", body: formData });

    const response = (await settingsAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Organization not found");
  });
});
