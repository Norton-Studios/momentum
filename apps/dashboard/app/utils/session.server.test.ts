import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserSession } from "@mmtm/resource-tenant";
import { createCookieSessionStorage } from "@remix-run/node";
import { getCurrentUser } from "./session.server";

// Mock the database and session functions
vi.mock("@mmtm/resource-tenant", () => ({
  getUserSession: vi.fn(),
  createUserSession: vi.fn(),
  deleteUserSession: vi.fn(),
}));

vi.mock("@mmtm/database", () => ({
  prisma: {},
}));

// Mock session object
const mockSession = {
  get: vi.fn(),
  set: vi.fn(),
  unset: vi.fn(),
  has: vi.fn(),
};

// Mock Remix session storage
vi.mock("@remix-run/node", () => ({
  createCookieSessionStorage: vi.fn(() => ({
    getSession: vi.fn(() => mockSession),
    commitSession: vi.fn(),
    destroySession: vi.fn(),
  })),
  redirect: vi.fn(),
}));

const mockGetUserSession = vi.mocked(getUserSession);
const _mockCreateCookieSessionStorage = vi.mocked(createCookieSessionStorage);

describe("Session Server Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return null when no session token in cookie", async () => {
      // Mock session.get to return null (no session token)
      mockSession.get.mockReturnValue(null);

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "",
        },
      });

      const user = await getCurrentUser(mockRequest);
      expect(user).toBeNull();
    });

    it("should return null when session is invalid", async () => {
      // Mock session.get to return a session token
      mockSession.get.mockReturnValue("invalid-token");
      mockGetUserSession.mockResolvedValue(null);

      // Mock a request with session cookie
      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=mock-session-data",
        },
      });

      const user = await getCurrentUser(mockRequest);
      expect(user).toBeNull();
    });

    it("should return user when session is valid", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        fullName: "Test User",
        tenantId: "tenant-1",
        tenant: {
          id: "tenant-1",
          name: "Test Org",
        },
      };

      // Mock session.get to return a valid session token
      mockSession.get.mockReturnValue("valid-token");

      mockGetUserSession.mockResolvedValue({
        id: "session-1",
        sessionToken: "valid-token",
        user: mockUser,
      } as any);

      // Mock a request with valid session cookie
      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=valid-session-data",
        },
      });

      const user = await getCurrentUser(mockRequest);
      expect(user).toEqual(mockUser);
    });
  });
});
