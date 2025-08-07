import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@remix-run/node";
import { getCurrentUser } from "~/utils/session.server";
import { loader, meta } from "./_index";
import Index from "./_index";

// Mock session utilities
vi.mock("~/utils/session.server", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Remix redirect
vi.mock("@remix-run/node", () => ({
  redirect: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);

describe("Index Route (_index)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock redirect to throw as expected by Remix
    mockRedirect.mockImplementation((url) => {
      throw new Response(null, { status: 302, headers: { Location: url } });
    });
  });

  describe("loader", () => {
    it("should redirect to /dashboard when user is authenticated", async () => {
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

      mockGetCurrentUser.mockResolvedValue(mockUser);

      const mockRequest = new Request("http://localhost:3000/");

      await expect(loader({ request: mockRequest, params: {}, context: {} })).rejects.toThrow();

      expect(mockGetCurrentUser).toHaveBeenCalledWith(mockRequest);
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("should redirect to /auth/signin when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const mockRequest = new Request("http://localhost:3000/");

      await expect(loader({ request: mockRequest, params: {}, context: {} })).rejects.toThrow();

      expect(mockGetCurrentUser).toHaveBeenCalledWith(mockRequest);
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should call getCurrentUser with the request object", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const mockRequest = new Request("http://localhost:3000/", {
        headers: {
          Cookie: "momentum_session=test-session",
        },
      });

      await expect(loader({ request: mockRequest, params: {}, context: {} })).rejects.toThrow();

      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
      expect(mockGetCurrentUser).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe("meta", () => {
    it("should return correct title and description", () => {
      const result = meta({
        data: undefined,
        params: {},
        location: {} as any,
        matches: [] as any,
      });

      expect(result).toEqual([
        { title: "Momentum - Developer Productivity Analytics" },
        { name: "description", content: "Measure and improve your team's productivity" },
      ]);
    });

    it("should return meta without requiring arguments", () => {
      const result = meta({
        data: undefined,
        params: {},
        location: {} as any,
        matches: [] as any,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);

      const [titleMeta, descriptionMeta] = result;
      expect(titleMeta).toHaveProperty("title");
      expect(descriptionMeta).toHaveProperty("name", "description");
      expect(descriptionMeta).toHaveProperty("content");
    });
  });

  describe("Index component", () => {
    it("should return null since it should never render", () => {
      const result = Index();
      expect(result).toBeNull();
    });

    it("should be a function that returns null", () => {
      expect(typeof Index).toBe("function");
      expect(Index()).toBe(null);
    });
  });
});
