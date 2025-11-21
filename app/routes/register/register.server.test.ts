import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAction } from "./register.server";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  register: vi.fn(),
  createUserSession: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { createUserSession, register } from "~/auth/auth.server";
import { db } from "~/db.server";

describe("registerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates all required fields", async () => {
    const formData = new FormData();

    const request = new Request("http://localhost/register", {
      method: "POST",
      body: formData,
    });

    const response = await registerAction({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it("validates email format", async () => {
    const formData = new FormData();
    formData.append("firstName", "John");
    formData.append("lastName", "Doe");
    formData.append("email", "invalid-email");
    formData.append("password", "password12345");
    formData.append("terms", "on");

    const request = new Request("http://localhost/register", {
      method: "POST",
      body: formData,
    });

    const response = await registerAction({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
  });

  it("validates password length", async () => {
    const formData = new FormData();
    formData.append("firstName", "John");
    formData.append("lastName", "Doe");
    formData.append("email", "john@example.com");
    formData.append("password", "short");
    formData.append("terms", "on");

    const request = new Request("http://localhost/register", {
      method: "POST",
      body: formData,
    });

    const response = await registerAction({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
  });

  it("checks for existing user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: "existing-user" } as never);

    const formData = new FormData();
    formData.append("firstName", "John");
    formData.append("lastName", "Doe");
    formData.append("email", "existing@example.com");
    formData.append("password", "password12345");
    formData.append("terms", "on");

    const request = new Request("http://localhost/register", {
      method: "POST",
      body: formData,
    });

    const response = await registerAction({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
    expect(register).not.toHaveBeenCalled();
  });

  it("registers new user successfully", async () => {
    const mockUser = { id: "new-user-123", email: "john@example.com", name: "John Doe" };
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(register).mockResolvedValue(mockUser as never);
    vi.mocked(createUserSession).mockResolvedValue(new Response(null, { status: 302 }));

    const formData = new FormData();
    formData.append("firstName", "John");
    formData.append("lastName", "Doe");
    formData.append("email", "john@example.com");
    formData.append("password", "password12345");
    formData.append("terms", "on");

    const request = new Request("http://localhost/register", {
      method: "POST",
      body: formData,
    });

    await registerAction({ request, params: {}, context: {} });

    expect(register).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "password12345",
      name: "John Doe",
    });
    expect(createUserSession).toHaveBeenCalledWith({
      request,
      userId: "new-user-123",
      redirectTo: "/onboarding/datasources",
    });
  });
});
