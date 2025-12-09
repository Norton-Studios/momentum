import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginAction } from "./login.server";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  login: vi.fn(),
  createUserSession: vi.fn(),
}));

import { createUserSession, login } from "~/auth/auth.server";

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates required fields and returns errors", async () => {
    const formData = new FormData();

    const request = new Request("http://localhost/login", {
      method: "POST",
      body: formData,
    });

    const response = (await loginAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it("calls login with correct credentials", async () => {
    const mockUser = { id: "user-123", email: "test@example.com", name: "Test User", role: "USER" };
    vi.mocked(login).mockResolvedValue(mockUser as never);
    vi.mocked(createUserSession).mockResolvedValue(new Response(null, { status: 302 }));

    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "correctpassword");

    const request = new Request("http://localhost/login", {
      method: "POST",
      body: formData,
    });

    await loginAction({ request, params: {}, context: {} } as never);

    expect(login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "correctpassword",
    });
    expect(createUserSession).toHaveBeenCalledWith({
      request,
      userId: "user-123",
      redirectTo: "/",
    });
  });

  it("returns error when login fails", async () => {
    vi.mocked(login).mockResolvedValue(null);

    const formData = new FormData();
    formData.append("email", "test@example.com");
    formData.append("password", "wrongpassword");

    const request = new Request("http://localhost/login", {
      method: "POST",
      body: formData,
    });

    const response = (await loginAction({ request, params: {}, context: {} } as never)) as unknown as Response;

    expect(response.status).toBe(400);
    expect(createUserSession).not.toHaveBeenCalled();
  });
});
