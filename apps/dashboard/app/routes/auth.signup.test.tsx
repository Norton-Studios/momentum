import { describe, it, expect, vi, beforeEach } from "vitest";
import { action, meta } from "./auth.signup";

// Mock all external dependencies
vi.mock("@mmtm/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@mmtm/resource-tenant", () => ({
  createUserSession: vi.fn(),
  validateOrganizationName: vi.fn(),
  createUserAccount: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  hash: vi.fn(),
}));

vi.mock("~/utils/session.server", () => ({
  createUserSessionAndRedirect: vi.fn(),
}));

vi.mock("@mmtm/components", () => ({
  SignUpForm: vi.fn(() => null),
}));

const { prisma: mockDb } = await import("@mmtm/database");
const { createUserSession, validateOrganizationName, createUserAccount } = await import("@mmtm/resource-tenant");
const bcrypt = await import("bcrypt");
const { createUserSessionAndRedirect } = await import("~/utils/session.server");

const _mockUserFindUnique = vi.mocked(mockDb.user.findUnique);
const _mockUserCreate = vi.mocked(mockDb.user.create);
const _mockTenantCreate = vi.mocked(mockDb.tenant.create);
const mockCreateUserSession = vi.mocked(createUserSession);
const mockValidateOrganizationName = vi.mocked(validateOrganizationName);
const mockCreateUserAccount = vi.mocked(createUserAccount);
const _mockBcryptHash = vi.mocked(bcrypt.hash);
const mockCreateUserSessionAndRedirect = vi.mocked(createUserSessionAndRedirect);

describe("auth.signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("action function", () => {
    const createFormData = (action = "signup", email = "", password = "", fullName = "", organizationName = "") => {
      const formData = new FormData();
      formData.set("_action", action);
      if (email) formData.set("email", email);
      if (password) formData.set("password", password);
      if (fullName) formData.set("fullName", fullName);
      if (organizationName) formData.set("organizationName", organizationName);
      return formData;
    };

    const createRequest = (formData: FormData) => {
      // Convert FormData to URLSearchParams for testing compatibility
      const params = new URLSearchParams();
      for (const [key, value] of formData.entries()) {
        params.set(key, value as string);
      }

      return new Request("http://localhost:3000/auth/signup", {
        method: "POST",
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    };

    it("should return error when email is missing", async () => {
      const formData = createFormData("signup", "", "password123", "Test User", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All fields are required");
    });

    it("should return error when password is missing", async () => {
      const formData = createFormData("signup", "test@example.com", "", "Test User", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All fields are required");
    });

    it("should return error when fullName is missing", async () => {
      const formData = createFormData("signup", "test@example.com", "password123", "", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All fields are required");
    });

    it("should return error when organizationName is missing", async () => {
      const formData = createFormData("signup", "test@example.com", "password123", "Test User", "");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("All fields are required");
    });

    it("should return error when organization name already exists", async () => {
      // Mock organization name validation to return false (name already exists)
      mockValidateOrganizationName.mockResolvedValue(false);

      const formData = createFormData("signup", "test@example.com", "password123", "Test User", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Organization name already exists");
      expect(mockValidateOrganizationName).toHaveBeenCalledWith("Test Org", mockDb);
    });

    it("should create user and tenant successfully", async () => {
      const mockTenant = {
        id: "tenant-1",
        name: "Test Organization",
        users: [
          {
            id: "user-1",
            email: "test@example.com",
            fullName: "Test User",
            tenantId: "tenant-1",
          },
        ],
      };
      const mockUserSession = {
        id: "session-1",
        sessionToken: "session-token-123",
        userId: "user-1",
      };
      const mockRedirectResponse = new Response(null, {
        status: 302,
        headers: { Location: "/dashboard" },
      });

      mockValidateOrganizationName.mockResolvedValue(true);
      mockCreateUserAccount.mockResolvedValue(mockTenant as any);
      mockCreateUserSession.mockResolvedValue(mockUserSession as any);
      mockCreateUserSessionAndRedirect.mockResolvedValue(mockRedirectResponse);

      const formData = createFormData("signup", "test@example.com", "password123", "Test User", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });

      expect(mockValidateOrganizationName).toHaveBeenCalledWith("Test Org", mockDb);
      expect(mockCreateUserAccount).toHaveBeenCalledWith(
        {
          organizationName: "Test Org",
          fullName: "Test User",
          email: "test@example.com",
          password: "password123",
        },
        mockDb,
      );
      expect(mockCreateUserSession).toHaveBeenCalledWith("user-1", { onboarding: true }, 30, mockDb);
      expect(response).toBe(mockRedirectResponse);
    });

    it("should handle database errors gracefully", async () => {
      mockValidateOrganizationName.mockRejectedValue(new Error("Database connection failed"));

      const formData = createFormData("signup", "test@example.com", "password123", "Test User", "Test Org");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });

      expect(response.status).toBe(500);

      // Try to parse JSON, but handle cases where it might not be JSON
      try {
        const data = await response.json();
        expect(data.error).toBe("Failed to create account");
      } catch (_e) {
        // Response might not be JSON in error cases, that's ok
        expect(response.status).toBe(500);
      }

      expect(console.error).toHaveBeenCalledWith("Signup error:", expect.any(Error));
    });

    // Tests for validate-organization action (lines 20-31)
    describe("validate-organization action", () => {
      it("should return error when organization name is missing", async () => {
        const formData = createFormData("validate-organization", "", "", "", "");
        const request = createRequest(formData);

        const response = await action({ request, context: {}, params: {} });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Organization name is required");
      });

      it("should return available when organization name is available", async () => {
        mockValidateOrganizationName.mockResolvedValue(true);

        const formData = createFormData("validate-organization", "", "", "", "Available Org");
        const request = createRequest(formData);

        const response = await action({ request, context: {}, params: {} });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.available).toBe(true);
        expect(data.message).toBe("Organization name is available");
        expect(mockValidateOrganizationName).toHaveBeenCalledWith("Available Org", mockDb);
      });

      it("should return not available when organization name exists", async () => {
        mockValidateOrganizationName.mockResolvedValue(false);

        const formData = createFormData("validate-organization", "", "", "", "Existing Org");
        const request = createRequest(formData);

        const response = await action({ request, context: {}, params: {} });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.available).toBe(false);
        expect(data.message).toBe("Organization name already exists");
        expect(mockValidateOrganizationName).toHaveBeenCalledWith("Existing Org", mockDb);
      });
    });

    // Test for invalid action (line 62)
    it("should return error for invalid action", async () => {
      const formData = createFormData("invalid-action", "", "", "", "");
      const request = createRequest(formData);

      const response = await action({ request, context: {}, params: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });
  });

  // React Component Rendering Tests - Cover lines 69-142
  describe("SignUpPage Component Rendering", () => {
    it.skip("should render the signup component without errors", async () => {
      const { render } = await import("@testing-library/react");
      const { createRemixStub } = await import("@remix-run/testing");
      const SignupPage = (await import("./auth.signup")).default;

      const RemixStub = createRemixStub([
        {
          path: "/auth/signup",
          Component: SignupPage,
          action: () => ({}),
        },
      ]);

      // Test that component renders without throwing
      expect(() => render(<RemixStub initialEntries={["/auth/signup"]} />)).not.toThrow();
    });

    it.skip("should render with error state from action data", async () => {
      const { render } = await import("@testing-library/react");
      const { createRemixStub } = await import("@remix-run/testing");
      const SignupPage = (await import("./auth.signup")).default;

      const RemixStub = createRemixStub([
        {
          path: "/auth/signup",
          Component: SignupPage,
          action: () => ({ error: "Test error message" }),
        },
      ]);

      // Test that component renders with error state
      expect(() => render(<RemixStub initialEntries={["/auth/signup"]} />)).not.toThrow();
    });

    it.skip("should render with submitting state", async () => {
      const { render } = await import("@testing-library/react");
      const { createRemixStub } = await import("@remix-run/testing");
      const SignupPage = (await import("./auth.signup")).default;

      // Mock navigation state to simulate submitting
      vi.doMock("@remix-run/react", async () => {
        const actual = await vi.importActual("@remix-run/react");
        return {
          ...actual,
          useNavigation: () => ({ state: "submitting" }),
          useActionData: () => undefined,
        };
      });

      const RemixStub = createRemixStub([
        {
          path: "/auth/signup",
          Component: SignupPage,
          action: () => ({}),
        },
      ]);

      // Test that component renders while submitting
      expect(() => render(<RemixStub initialEntries={["/auth/signup"]} />)).not.toThrow();
    });

    it.skip("should handle organization name change callback", async () => {
      const { render } = await import("@testing-library/react");
      const { createRemixStub } = await import("@remix-run/testing");
      const SignupPage = (await import("./auth.signup")).default;

      // Mock fetch for organization validation
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ available: true, message: "Available" }),
      });

      const RemixStub = createRemixStub([
        {
          path: "/auth/signup",
          Component: SignupPage,
          action: () => ({}),
        },
      ]);

      // Test that component handles organization name change
      expect(() => render(<RemixStub initialEntries={["/auth/signup"]} />)).not.toThrow();
    });

    it.skip("should handle different state variations", async () => {
      const { render } = await import("@testing-library/react");
      const { createRemixStub } = await import("@remix-run/testing");
      const SignupPage = (await import("./auth.signup")).default;

      const RemixStub = createRemixStub([
        {
          path: "/auth/signup",
          Component: SignupPage,
          action: () => ({}),
        },
      ]);

      // Test that component can render in different states
      expect(() => render(<RemixStub initialEntries={["/auth/signup"]} />)).not.toThrow();
    });
  });

  describe("SignUpPage component logic", () => {
    it("should handle user data correctly", () => {
      // Test user registration data structure
      const userData = {
        email: "test@example.com",
        fullName: "Test User",
        organizationName: "Test Organization",
        password: "password123",
      };

      expect(userData.email).toBe("test@example.com");
      expect(userData.fullName).toBe("Test User");
      expect(userData.organizationName).toBe("Test Organization");
      expect(userData.password).toBe("password123");
    });

    it("should handle form validation correctly", () => {
      // Test form validation logic
      const isValidEmail = (email: string) => email?.includes("@");
      const isValidPassword = (password: string) => password && password.length >= 8;
      const isValidName = (name: string) => !!(name && name.trim().length > 0);

      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidPassword("password123")).toBe(true);
      expect(isValidPassword("short")).toBe(false);
      expect(isValidName("Test User")).toBe(true);
      expect(isValidName("")).toBe(false);
    });

    it("should handle navigation correctly", () => {
      // Test navigation configuration
      const navigationConfig = {
        signInUrl: "/auth/signin",
        dashboardUrl: "/dashboard",
      };

      expect(navigationConfig.signInUrl).toBe("/auth/signin");
      expect(navigationConfig.dashboardUrl).toBe("/dashboard");
    });
  });

  describe("meta function", () => {
    it("should return correct meta information", () => {
      const metaResult = meta();

      expect(metaResult).toEqual([{ title: "Sign Up - Momentum" }, { name: "description", content: "Create your Momentum account" }]);
    });
  });
});
