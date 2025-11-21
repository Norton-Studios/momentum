import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, login, register, verifyPassword } from "./auth.server";

vi.mock("~/db.server", () => ({
  db: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "~/db.server";

describe("hashPassword", () => {
  it("returns a hashed string different from input", async () => {
    const password = "testpassword123";
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(0);
  });

  it("produces different hashes for same password", async () => {
    const password = "testpassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for matching password", async () => {
    const password = "testpassword123";
    const hashed = await hashPassword(password);

    const result = await verifyPassword(password, hashed);

    expect(result).toBe(true);
  });

  it("returns false for non-matching password", async () => {
    const password = "testpassword123";
    const wrongPassword = "wrongpassword";
    const hashed = await hashPassword(password);

    const result = await verifyPassword(wrongPassword, hashed);

    expect(result).toBe(false);
  });
});

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates user with hashed password", async () => {
    const mockUser = { id: "1", email: "test@example.com", name: "Test User" };
    vi.mocked(db.user.create).mockResolvedValue(mockUser as never);

    const result = await register({
      email: "test@example.com",
      password: "testpassword123",
      name: "Test User",
    });

    expect(db.user.create).toHaveBeenCalledTimes(1);
    const createCall = vi.mocked(db.user.create).mock.calls[0][0];
    expect(createCall.data.email).toBe("test@example.com");
    expect(createCall.data.name).toBe("Test User");
    expect(createCall.data.password).not.toBe("testpassword123");
    expect(createCall.data.password.length).toBeGreaterThan(0);
    expect(result).toEqual(mockUser);
  });
});

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user for valid credentials", async () => {
    const hashedPassword = await hashPassword("validpassword1");
    const mockUser = {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
    };
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);

    const result = await login({
      email: "test@example.com",
      password: "validpassword1",
    });

    expect(result).toEqual(mockUser);
  });

  it("returns null for non-existent user", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const result = await login({
      email: "nonexistent@example.com",
      password: "anypassword123",
    });

    expect(result).toBeNull();
  });

  it("returns null for invalid password", async () => {
    const hashedPassword = await hashPassword("correctpassword");
    const mockUser = {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
    };
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as never);

    const result = await login({
      email: "test@example.com",
      password: "wrongpassword1",
    });

    expect(result).toBeNull();
  });
});
