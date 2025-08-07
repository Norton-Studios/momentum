import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserSession } from "@mmtm/resource-tenant";
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

const mockGetUserSession = vi.mocked(getUserSession);

describe("Session Server Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("should return null when no session token in cookie", async () => {
      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "",
        },
      });

      const user = await getCurrentUser(mockRequest);
      expect(user).toBeNull();
    });

    it("should return null when session is invalid", async () => {
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
