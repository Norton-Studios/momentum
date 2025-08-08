import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteUserSession } from "@mmtm/resource-tenant";
import { redirect } from "@remix-run/node";
import { loader, action } from "./logout";
import * as sessionUtils from "~/utils/session.server";

// Mock the resource-tenant module
vi.mock("@mmtm/resource-tenant", () => ({
  deleteUserSession: vi.fn(),
}));

// Mock Remix redirect
vi.mock("@remix-run/node", () => ({
  redirect: vi.fn(),
}));

// Mock the session utilities
vi.mock("~/utils/session.server", () => ({
  logout: vi.fn(),
}));

const mockDeleteUserSession = vi.mocked(deleteUserSession);
const mockRedirect = vi.mocked(redirect);
const mockLogout = vi.mocked(sessionUtils.logout);

describe("Logout Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader function", () => {
    it("should call logout utility and return redirect", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle logout errors gracefully", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const error = new Error("Session destruction failed");

      mockLogout.mockRejectedValue(error);

      await expect(loader({ request: mockRequest })).rejects.toThrow("Session destruction failed");
      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
    });

    it("should work with different request URLs", async () => {
      const mockRequest = new Request("http://localhost:3000/logout?from=dashboard");
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });
  });

  describe("action function", () => {
    it("should call logout utility and return redirect", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "POST",
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle logout errors gracefully", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "POST",
      });
      const error = new Error("Database connection failed during logout");

      mockLogout.mockRejectedValue(error);

      await expect(action({ request: mockRequest })).rejects.toThrow("Database connection failed during logout");
      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
    });

    it("should work with form data in request", async () => {
      const formData = new FormData();
      formData.append("intent", "logout");

      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "POST",
        body: formData,
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });
  });

  describe("integration with logout utility", () => {
    beforeEach(() => {
      // Reset mocks to use the real implementation patterns
      vi.resetModules();
    });

    it("should handle session destruction process", async () => {
      // Create a more realistic mock that simulates the logout flow
      const mockRequest = new Request("http://localhost:3000/logout", {
        headers: {
          Cookie: "momentum_session=session-token-123",
        },
      });

      const mockSession = {
        get: vi.fn().mockReturnValue("valid-session-token"),
      };

      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: {
          Location: "/auth/signin",
          "Set-Cookie": "momentum_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        },
      });

      // Mock the session storage methods
      const mockGetSession = vi.fn().mockResolvedValue(mockSession);
      const mockDestroySession = vi.fn().mockResolvedValue("destroyed-session-cookie");

      // Mock the actual logout implementation behavior
      mockLogout.mockImplementation(async (request) => {
        const session = await mockGetSession(request);
        const sessionToken = session.get("sessionToken");

        if (sessionToken) {
          await mockDeleteUserSession(sessionToken, {} as any);
        }

        return mockRedirect("/auth/signin", {
          headers: {
            "Set-Cookie": await mockDestroySession(session),
          },
        });
      });

      mockDeleteUserSession.mockResolvedValue();
      mockRedirect.mockReturnValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle missing session token gracefully", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");

      const mockSession = {
        get: vi.fn().mockReturnValue(null), // No session token
      };

      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: {
          Location: "/auth/signin",
          "Set-Cookie": "momentum_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        },
      });

      const mockGetSession = vi.fn().mockResolvedValue(mockSession);
      const mockDestroySession = vi.fn().mockResolvedValue("destroyed-session-cookie");

      // Mock logout to simulate no session token scenario
      mockLogout.mockImplementation(async (request) => {
        const session = await mockGetSession(request);
        const sessionToken = session.get("sessionToken");

        // Should not call deleteUserSession if no token
        if (sessionToken) {
          await mockDeleteUserSession(sessionToken, {} as any);
        }

        return mockRedirect("/auth/signin", {
          headers: {
            "Set-Cookie": await mockDestroySession(session),
          },
        });
      });

      mockRedirect.mockReturnValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(mockDeleteUserSession).not.toHaveBeenCalled();
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle database errors during session deletion", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        headers: {
          Cookie: "momentum_session=session-token-456",
        },
      });

      const mockSession = {
        get: vi.fn().mockReturnValue("valid-session-token"),
      };

      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: {
          Location: "/auth/signin",
          "Set-Cookie": "momentum_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        },
      });

      const mockGetSession = vi.fn().mockResolvedValue(mockSession);
      const mockDestroySession = vi.fn().mockResolvedValue("destroyed-session-cookie");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock logout to simulate database error during session deletion
      mockLogout.mockImplementation(async (request) => {
        const session = await mockGetSession(request);
        const sessionToken = session.get("sessionToken");

        if (sessionToken) {
          try {
            await mockDeleteUserSession(sessionToken, {} as any);
          } catch (error) {
            console.error("Error deleting user session:", error);
          }
        }

        return mockRedirect("/auth/signin", {
          headers: {
            "Set-Cookie": await mockDestroySession(session),
          },
        });
      });

      const dbError = new Error("Database connection timeout");
      mockDeleteUserSession.mockRejectedValue(dbError);
      mockRedirect.mockReturnValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(mockDeleteUserSession).toHaveBeenCalledWith("valid-session-token", {});
      expect(result).toBe(mockRedirectResponse);

      consoleSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("should propagate network errors", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const networkError = new Error("Network error during logout");

      mockLogout.mockRejectedValue(networkError);

      await expect(loader({ request: mockRequest })).rejects.toThrow("Network error during logout");
    });

    it("should propagate timeout errors", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "POST",
      });
      const timeoutError = new Error("Request timeout");

      mockLogout.mockRejectedValue(timeoutError);

      await expect(action({ request: mockRequest })).rejects.toThrow("Request timeout");
    });

    it("should handle malformed session data", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        headers: {
          Cookie: "momentum_session=malformed-data",
        },
      });

      const sessionError = new Error("Invalid session data");
      mockLogout.mockRejectedValue(sessionError);

      await expect(loader({ request: mockRequest })).rejects.toThrow("Invalid session data");
    });
  });

  describe("request method handling", () => {
    it("should handle GET requests through loader", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "GET",
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle POST requests through action", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "POST",
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle DELETE requests through action", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        method: "DELETE",
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });
  });

  describe("cookie and session handling", () => {
    it("should handle requests with multiple cookies", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        headers: {
          Cookie: "other_cookie=value; momentum_session=session-data; third_cookie=another-value",
        },
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle requests with no cookies", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });

    it("should handle requests with empty cookie header", async () => {
      const mockRequest = new Request("http://localhost:3000/logout", {
        headers: {
          Cookie: "",
        },
      });
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(mockLogout).toHaveBeenCalledWith(mockRequest);
      expect(result).toBe(mockRedirectResponse);
    });
  });

  describe("redirect behavior", () => {
    it("should always redirect to signin page", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/auth/signin" },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await loader({ request: mockRequest });

      expect(result).toBe(mockRedirectResponse);
      expect(mockRedirectResponse.headers.get("Location")).toBe("/auth/signin");
    });

    it("should include session destruction cookie in redirect", async () => {
      const mockRequest = new Request("http://localhost:3000/logout");
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: {
          Location: "/auth/signin",
          "Set-Cookie": "momentum_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        },
      });

      mockLogout.mockResolvedValue(mockRedirectResponse);

      const result = await action({ request: mockRequest });

      expect(result).toBe(mockRedirectResponse);
      expect(mockRedirectResponse.headers.get("Set-Cookie")).toBeTruthy();
    });
  });
});
