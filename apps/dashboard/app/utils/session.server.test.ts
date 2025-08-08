import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserSession, deleteUserSession } from "@mmtm/resource-tenant";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { getCurrentUser, getSession, commitSession, destroySession, requireUser, createUserSessionAndRedirect, logout } from "./session.server";

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
    commitSession: vi.fn(() => Promise.resolve("set-cookie-header")),
    destroySession: vi.fn(() => Promise.resolve("destroy-cookie-header")),
  })),
  redirect: vi.fn(),
}));

const mockGetUserSession = vi.mocked(getUserSession);
const mockDeleteUserSession = vi.mocked(deleteUserSession);
const _mockRedirect = vi.mocked(redirect);
const mockCreateCookieSessionStorage = vi.mocked(createCookieSessionStorage);

// Get the mocked session storage instance
const mockSessionStorage = mockCreateCookieSessionStorage.mock.results[0]?.value;

describe("Session Server Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset session storage mocks
    mockSessionStorage.getSession.mockReturnValue(mockSession);
    mockSessionStorage.commitSession.mockResolvedValue("set-cookie-header");
    mockSessionStorage.destroySession.mockResolvedValue("destroy-cookie-header");
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

    it("should return null when getUserSession throws an error", async () => {
      // Mock session.get to return a session token
      mockSession.get.mockReturnValue("valid-token");
      mockGetUserSession.mockRejectedValue(new Error("Database error"));

      // Mock console.error to avoid noise in test output
      const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=mock-session-data",
        },
      });

      const user = await getCurrentUser(mockRequest);
      expect(user).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith("Error getting current user:", expect.any(Error));

      mockConsoleError.mockRestore();
    });
  });

  describe("getSession", () => {
    it("should retrieve session from cookie", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=session-data",
        },
      });

      const result = await getSession(mockRequest);
      expect(result).toBeDefined();
      expect(typeof result.get).toBe("function");
    });

    it("should handle request with no cookies", async () => {
      const mockRequest = new Request("http://localhost:3000");

      const result = await getSession(mockRequest);
      expect(result).toBeDefined();
      expect(typeof result.get).toBe("function");
    });
  });

  describe("commitSession", () => {
    it("should commit session and return cookie header", async () => {
      const result = await commitSession(mockSession);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("destroySession", () => {
    it("should destroy session and return cookie header", async () => {
      const result = await destroySession(mockSession);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("requireUser", () => {
    it("should return user when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        fullName: "Test User",
        tenantId: "tenant-1",
      };

      mockSession.get.mockReturnValue("valid-token");
      mockGetUserSession.mockResolvedValue({
        id: "session-1",
        sessionToken: "valid-token",
        user: mockUser,
      } as any);

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=valid-session-data",
        },
      });

      const user = await requireUser(mockRequest);
      expect(user).toEqual(mockUser);
    });

    it("should redirect to signin when not authenticated", async () => {
      mockSession.get.mockReturnValue(null);

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "",
        },
      });

      await expect(requireUser(mockRequest)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect to signin when session is invalid", async () => {
      mockSession.get.mockReturnValue("invalid-token");
      mockGetUserSession.mockResolvedValue(null);

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=invalid-session-data",
        },
      });

      await expect(requireUser(mockRequest)).rejects.toThrow();
      expect(redirect).toHaveBeenCalledWith("/auth/signin");
    });
  });

  describe("createUserSessionAndRedirect", () => {
    it("should create session and redirect to default path", async () => {
      const sessionToken = "new-session-token";

      try {
        await createUserSessionAndRedirect(sessionToken);
      } catch (redirectResponse) {
        // This function throws a redirect Response
        expect(redirectResponse).toBeInstanceOf(Response);
        expect((redirectResponse as Response).status).toBe(302);
      }
    });

    it("should create session and redirect to specified path", async () => {
      const sessionToken = "new-session-token";
      const redirectTo = "/dashboard";

      try {
        await createUserSessionAndRedirect(sessionToken, redirectTo);
      } catch (redirectResponse) {
        // This function throws a redirect Response
        expect(redirectResponse).toBeInstanceOf(Response);
        expect((redirectResponse as Response).status).toBe(302);
        expect((redirectResponse as Response).headers.get("Location")).toBe("/dashboard");
      }
    });
  });

  describe("logout", () => {
    it("should delete session from database and redirect", async () => {
      const sessionToken = "session-to-delete";
      mockSession.get.mockReturnValue(sessionToken);
      mockDeleteUserSession.mockResolvedValue();

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=session-data",
        },
      });

      try {
        await logout(mockRequest);
      } catch (redirectResponse) {
        // This function throws a redirect Response
        expect(redirectResponse).toBeInstanceOf(Response);
        expect((redirectResponse as Response).status).toBe(302);
        expect((redirectResponse as Response).headers.get("Location")).toBe("/auth/signin");
      }

      expect(mockDeleteUserSession).toHaveBeenCalledWith(sessionToken, {});
    });

    it("should handle logout without session token", async () => {
      mockSession.get.mockReturnValue(null);

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "",
        },
      });

      try {
        await logout(mockRequest);
      } catch (redirectResponse) {
        // This function throws a redirect Response
        expect(redirectResponse).toBeInstanceOf(Response);
        expect((redirectResponse as Response).status).toBe(302);
        expect((redirectResponse as Response).headers.get("Location")).toBe("/auth/signin");
      }

      expect(mockDeleteUserSession).not.toHaveBeenCalled();
    });

    it("should handle database error during session deletion", async () => {
      const sessionToken = "session-to-delete";
      mockSession.get.mockReturnValue(sessionToken);
      mockDeleteUserSession.mockRejectedValue(new Error("Database error"));

      // Mock console.error to avoid noise in test output
      const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "momentum_session=session-data",
        },
      });

      try {
        await logout(mockRequest);
      } catch (redirectResponse) {
        // This function throws a redirect Response
        expect(redirectResponse).toBeInstanceOf(Response);
        expect((redirectResponse as Response).status).toBe(302);
        expect((redirectResponse as Response).headers.get("Location")).toBe("/auth/signin");
      }

      expect(mockDeleteUserSession).toHaveBeenCalledWith(sessionToken, {});
      expect(mockConsoleError).toHaveBeenCalledWith("Error deleting user session:", expect.any(Error));

      mockConsoleError.mockRestore();
    });
  });
});
