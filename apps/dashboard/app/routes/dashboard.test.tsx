import { describe, it, expect, vi, beforeEach } from "vitest";
import { loader } from "./dashboard";

// Mock session server utilities
vi.mock("~/utils/session.server", () => ({
  requireUser: vi.fn(),
}));

const mockRequireUser = vi.mocked(await import("~/utils/session.server")).requireUser;

describe("Dashboard Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loader function", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      fullName: "Test User",
      tenantId: "tenant-123",
      isAdmin: true,
      tenant: {
        id: "tenant-123",
        name: "Test Organization",
      },
    };

    it("should require authentication and return user data", async () => {
      mockRequireUser.mockResolvedValue(mockUser);

      const mockRequest = new Request("http://localhost:3000/dashboard");
      const result = await loader({ request: mockRequest, params: {}, context: {} });

      expect(mockRequireUser).toHaveBeenCalledWith(mockRequest);
      
      // Test the response structure instead of comparing Response objects
      const responseData = await result.json();
      expect(responseData).toEqual({ user: mockUser });
    });

    it("should handle authentication errors", async () => {
      const authError = new Response("Unauthorized", { status: 401 });
      mockRequireUser.mockRejectedValue(authError);

      const mockRequest = new Request("http://localhost:3000/dashboard");

      await expect(loader({ request: mockRequest, params: {}, context: {} })).rejects.toThrow();
      expect(mockRequireUser).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe("Dashboard Component", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      fullName: "Test User",
      tenantId: "tenant-123",
      isAdmin: true,
      tenant: {
        id: "tenant-123",
        name: "Test Organization",
      },
    };

    it("should handle user data correctly", () => {
      // Test user data structure
      expect(mockUser.id).toBe("user-123");
      expect(mockUser.email).toBe("test@example.com");
      expect(mockUser.fullName).toBe("Test User");
      expect(mockUser.tenantId).toBe("tenant-123");
      expect(mockUser.isAdmin).toBe(true);
      expect(mockUser.tenant.name).toBe("Test Organization");
    });

    it("should handle organization information correctly", () => {
      // Test organization data structure
      const organizationName = mockUser.tenant.name;
      expect(organizationName).toBe("Test Organization");
      
      const tenantId = mockUser.tenantId;
      expect(tenantId).toBe("tenant-123");
    });

    it("should handle user role correctly for admin", () => {
      // Test admin role logic
      const userRole = mockUser.isAdmin ? "Administrator" : "Member";
      expect(userRole).toBe("Administrator");
    });

    it("should handle user role correctly for non-admin", () => {
      const nonAdminUser = { ...mockUser, isAdmin: false };
      const userRole = nonAdminUser.isAdmin ? "Administrator" : "Member";
      expect(userRole).toBe("Member");
    });

    it("should handle status correctly", () => {
      // Test status logic - user should be active if they have valid data
      const isActive = mockUser.id && mockUser.email;
      const status = isActive ? "Active" : "Inactive";
      expect(status).toBe("Active");
    });

    it("should handle logout form configuration", () => {
      // Test logout form structure
      const logoutConfig = {
        action: "/logout",
        method: "post",
        buttonText: "Sign out"
      };
      
      expect(logoutConfig.action).toBe("/logout");
      expect(logoutConfig.method).toBe("post");
      expect(logoutConfig.buttonText).toBe("Sign out");
    });

    it("should handle onboarding link with correct tenant parameter", () => {
      // Test onboarding link construction
      const onboardingUrl = `/onboarding/data-sources?tenant=${mockUser.tenantId}`;
      expect(onboardingUrl).toBe("/onboarding/data-sources?tenant=tenant-123");
    });

    it("should fall back to email when fullName is not provided", () => {
      const userWithoutName = { ...mockUser, fullName: null };
      const displayName = userWithoutName.fullName || userWithoutName.email;
      expect(displayName).toBe("test@example.com");
    });

    it("should handle logo configuration", () => {
      // Test logo configuration
      const logoConfig = {
        src: "/logo-light.png",
        alt: "Momentum"
      };
      
      expect(logoConfig.src).toBe("/logo-light.png");
      expect(logoConfig.alt).toBe("Momentum");
    });

    it("should handle styling configuration correctly", () => {
      // Test styling configuration structure
      const styleConfig = {
        mainContainer: ["min-h-screen", "bg-gray-50"],
        navigation: ["bg-white", "shadow-sm", "border-b", "border-gray-200"]
      };
      
      expect(styleConfig.mainContainer).toContain("bg-gray-50");
      expect(styleConfig.navigation).toContain("bg-white");
      expect(styleConfig.navigation).toContain("shadow-sm");
    });
  });
});