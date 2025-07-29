import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { PrismaClient } from "@mmtm/database";
import { createAuthMiddleware, requireAdmin, type AuthenticatedRequest } from "./auth";

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.fn();
vi.stubGlobal("console", { error: mockConsoleError });

import bcrypt from "bcrypt";

describe("Authentication Middleware", () => {
  let mockDb: PrismaClient;
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockConsoleError.mockClear();

    // Create mock database
    mockDb = {
      user: {
        findFirst: vi.fn(),
      },
    } as any;

    // Create mock request
    mockReq = {
      headers: {},
      path: "/some-path",
      method: "GET",
    };

    // Create mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Create mock next function
    mockNext = vi.fn();
  });

  describe("createAuthMiddleware", () => {
    it("should skip authentication for tenant creation endpoint", async () => {
      mockReq.path = "/tenant";
      mockReq.method = "POST";

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockDb.user.findFirst).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should skip authentication for health check endpoint", async () => {
      mockReq.path = "/";
      mockReq.method = "GET";

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockDb.user.findFirst).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is missing", async () => {
      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing or invalid authorization header",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when authorization header is not Basic", async () => {
      mockReq.headers!.authorization = "Bearer invalid-token";

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing or invalid authorization header",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when credentials format is invalid (no colon)", async () => {
      // Base64 encode "invalid" (no colon)
      const invalidCredentials = Buffer.from("invalid").toString("base64");
      mockReq.headers!.authorization = `Basic ${invalidCredentials}`;

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials format",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when email is missing", async () => {
      // Base64 encode ":password" (empty email)
      const invalidCredentials = Buffer.from(":password").toString("base64");
      mockReq.headers!.authorization = `Basic ${invalidCredentials}`;

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials format",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when password is missing", async () => {
      // Base64 encode "email:" (empty password)
      const invalidCredentials = Buffer.from("email:").toString("base64");
      mockReq.headers!.authorization = `Basic ${invalidCredentials}`;

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials format",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when user is not found", async () => {
      const credentials = Buffer.from("test@example.com:password").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      (mockDb.user.findFirst as any).mockResolvedValue(null);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockDb.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "test@example.com" }, { apiToken: "test@example.com" }],
        },
        include: {
          tenant: true,
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should authenticate successfully with valid email and password", async () => {
      const credentials = Buffer.from("test@example.com:password123").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed-password");
      expect(mockReq.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        tenantId: "tenant-123",
        isAdmin: false,
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should authenticate successfully with valid API token", async () => {
      const apiToken = "api-token-123";
      const credentials = Buffer.from(`${apiToken}:${apiToken}`).toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: true,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        tenantId: "tenant-123",
        isAdmin: true,
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 401 when password is incorrect", async () => {
      const credentials = Buffer.from("test@example.com:wrongpassword").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(bcrypt.compare).toHaveBeenCalledWith("wrongpassword", "hashed-password");
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when API token is incorrect", async () => {
      const wrongToken = "wrong-token";
      const credentials = Buffer.from(`${wrongToken}:${wrongToken}`).toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "correct-token",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle mixed credentials (email with API token as password)", async () => {
      const credentials = Buffer.from("test@example.com:api-token-123").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(bcrypt.compare).toHaveBeenCalledWith("api-token-123", "hashed-password");
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 500 when database query fails", async () => {
      const credentials = Buffer.from("test@example.com:password").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const dbError = new Error("Database connection failed");
      (mockDb.user.findFirst as any).mockRejectedValue(dbError);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith("Authentication error:", dbError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Authentication failed",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 500 when bcrypt.compare fails", async () => {
      const credentials = Buffer.from("test@example.com:password").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);
      const bcryptError = new Error("bcrypt failed");
      (bcrypt.compare as any).mockRejectedValue(bcryptError);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockConsoleError).toHaveBeenCalledWith("Authentication error:", bcryptError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Authentication failed",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle malformed base64 credentials", async () => {
      mockReq.headers!.authorization = "Basic invalid-base64!@#";

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // The middleware decodes the base64 but gets malformed credentials
      // This should result in invalid credentials format
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials format",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle credentials with multiple colons", async () => {
      // Base64 encode "user:pass:word" (multiple colons)
      const credentials = Buffer.from("user:pass:word").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "user",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(bcrypt.compare).toHaveBeenCalledWith("pass", "hashed-password");
      expect(mockReq.user).toEqual({
        id: "user-123",
        email: "user",
        tenantId: "tenant-123",
        isAdmin: false,
      });
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should handle user found by API token but trying to use email authentication", async () => {
      const credentials = Buffer.from("api-token-123:password").toString("base64");
      mockReq.headers!.authorization = `Basic ${credentials}`;

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        apiToken: "api-token-123",
        tenantId: "tenant-123",
        isAdmin: false,
        tenant: { id: "tenant-123", name: "Test Tenant" },
      };

      (mockDb.user.findFirst as any).mockResolvedValue(mockUser);

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle empty authorization header after Basic", async () => {
      mockReq.headers!.authorization = "Basic ";

      const middleware = createAuthMiddleware(mockDb);
      await middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      // Empty base64 string would decode to empty string, resulting in invalid format
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid credentials format",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("should call next() when user is admin", () => {
      mockReq.user = {
        id: "user-123",
        email: "admin@example.com",
        tenantId: "tenant-123",
        isAdmin: true,
      };

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not admin", () => {
      mockReq.user = {
        id: "user-123",
        email: "user@example.com",
        tenantId: "tenant-123",
        isAdmin: false,
      };

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not set", () => {
      mockReq.user = undefined;

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user object is null", () => {
      mockReq.user = null as any;

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user.isAdmin is explicitly false", () => {
      mockReq.user = {
        id: "user-123",
        email: "user@example.com",
        tenantId: "tenant-123",
        isAdmin: false,
      };

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user.isAdmin is undefined", () => {
      mockReq.user = {
        id: "user-123",
        email: "user@example.com",
        tenantId: "tenant-123",
        isAdmin: undefined as any,
      };

      requireAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin access required",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
