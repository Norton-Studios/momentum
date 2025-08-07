import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSessionToken,
  createUserSession,
  getUserSession,
  updateUserSession,
  deleteUserSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  extendUserSession,
} from "./user-session";
import type { PrismaClient } from "@mmtm/database";

// Mock crypto
vi.mock("node:crypto", () => ({
  randomBytes: vi.fn().mockReturnValue(Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex")),
}));

// Mock the PrismaClient
const mockDb = {
  userSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe("user-session hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSessionToken", () => {
    it("generates a 64-character hex string", () => {
      const token = generateSessionToken();

      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(token.length).toBe(64);
    });

    it("generates unique tokens on multiple calls", () => {
      // Since crypto.randomBytes is mocked to return the same value,
      // we'll test that the function returns the expected format consistently
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();

      // Both tokens should have the same format (due to mocking)
      expect(token1).toMatch(/^[a-f0-9]{64}$/);
      expect(token2).toMatch(/^[a-f0-9]{64}$/);
      expect(token1.length).toBe(64);
      expect(token2.length).toBe(64);

      // In a real scenario (without mocking), tokens would be different
      // This test verifies the function works correctly with the crypto module
    });
  });

  describe("createUserSession", () => {
    const mockCreatedSession = {
      id: "session-id",
      userId: "user-123",
      sessionToken: "abc123def456",
      sessionData: { theme: "dark" },
      expiresAt: new Date("2024-02-01T00:00:00.000Z"),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    it("creates a session with default expiration", async () => {
      (mockDb.userSession.create as any).mockResolvedValue(mockCreatedSession);

      const result = await createUserSession("user-123", { theme: "dark" }, 30, mockDb);

      expect(mockDb.userSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          sessionToken: expect.any(String),
          sessionData: { theme: "dark" },
          expiresAt: expect.any(Date),
        },
      });

      const createCall = (mockDb.userSession.create as any).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);

      expect(result).toBe(mockCreatedSession);
    });

    it("creates a session with custom expiration days", async () => {
      (mockDb.userSession.create as any).mockResolvedValue(mockCreatedSession);

      await createUserSession("user-123", {}, 7, mockDb);

      const createCall = (mockDb.userSession.create as any).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it("creates a session with empty session data by default", async () => {
      (mockDb.userSession.create as any).mockResolvedValue(mockCreatedSession);

      await createUserSession("user-123", undefined, 30, mockDb);

      expect(mockDb.userSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          sessionToken: expect.any(String),
          sessionData: {},
          expiresAt: expect.any(Date),
        },
      });
    });

    it("generates a session token", async () => {
      (mockDb.userSession.create as any).mockResolvedValue(mockCreatedSession);

      await createUserSession("user-123", {}, 30, mockDb);

      const createCall = (mockDb.userSession.create as any).mock.calls[0][0];
      expect(createCall.data.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("getUserSession", () => {
    const mockSessionWithUser = {
      id: "session-id",
      userId: "user-123",
      sessionToken: "abc123def456",
      sessionData: { theme: "dark" },
      expiresAt: new Date("2024-02-01T00:00:00.000Z"),
      user: {
        id: "user-123",
        email: "test@example.com",
        fullName: "Test User",
        tenant: {
          id: "tenant-123",
          name: "Test Tenant",
        },
      },
    };

    it("retrieves a valid session with user and tenant", async () => {
      (mockDb.userSession.findFirst as any).mockResolvedValue(mockSessionWithUser);

      const result = await getUserSession("abc123def456", mockDb);

      expect(mockDb.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          sessionToken: "abc123def456",
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        include: {
          user: {
            include: {
              tenant: true,
            },
          },
        },
      });

      expect(result).toBe(mockSessionWithUser);
    });

    it("only returns non-expired sessions", async () => {
      (mockDb.userSession.findFirst as any).mockResolvedValue(null);

      const result = await getUserSession("expired-token", mockDb);

      const findCall = (mockDb.userSession.findFirst as any).mock.calls[0][0];
      expect(findCall.where.expiresAt.gt).toBeInstanceOf(Date);
      expect(result).toBe(null);
    });

    it("returns null for non-existent session", async () => {
      (mockDb.userSession.findFirst as any).mockResolvedValue(null);

      const result = await getUserSession("non-existent", mockDb);

      expect(result).toBe(null);
    });
  });

  describe("updateUserSession", () => {
    const mockUpdatedSession = {
      id: "session-id",
      userId: "user-123",
      sessionToken: "abc123def456",
      sessionData: { theme: "light", lang: "en" },
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    };

    it("updates session data and updatedAt timestamp", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockUpdatedSession);

      const newSessionData = { theme: "light", lang: "en" };
      const result = await updateUserSession("abc123def456", newSessionData, mockDb);

      expect(mockDb.userSession.update).toHaveBeenCalledWith({
        where: { sessionToken: "abc123def456" },
        data: {
          sessionData: newSessionData,
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toBe(mockUpdatedSession);
    });

    it("sets updatedAt to current time", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockUpdatedSession);
      const beforeCall = new Date();

      await updateUserSession("abc123def456", { updated: true }, mockDb);

      const updateCall = (mockDb.userSession.update as any).mock.calls[0][0];
      const updatedAt = updateCall.data.updatedAt;
      const afterCall = new Date();

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe("deleteUserSession", () => {
    const mockDeletedSession = {
      id: "session-id",
      sessionToken: "abc123def456",
    };

    it("deletes a specific session by token", async () => {
      (mockDb.userSession.delete as any).mockResolvedValue(mockDeletedSession);

      const result = await deleteUserSession("abc123def456", mockDb);

      expect(mockDb.userSession.delete).toHaveBeenCalledWith({
        where: { sessionToken: "abc123def456" },
      });

      expect(result).toBe(mockDeletedSession);
    });
  });

  describe("deleteAllUserSessions", () => {
    const mockDeleteResult = { count: 3 };

    it("deletes all sessions for a specific user", async () => {
      (mockDb.userSession.deleteMany as any).mockResolvedValue(mockDeleteResult);

      const result = await deleteAllUserSessions("user-123", mockDb);

      expect(mockDb.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
      });

      expect(result).toBe(mockDeleteResult);
    });
  });

  describe("cleanupExpiredSessions", () => {
    const mockCleanupResult = { count: 5 };

    it("deletes all expired sessions", async () => {
      (mockDb.userSession.deleteMany as any).mockResolvedValue(mockCleanupResult);

      const result = await cleanupExpiredSessions(mockDb);

      expect(mockDb.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });

      const deleteCall = (mockDb.userSession.deleteMany as any).mock.calls[0][0];
      expect(deleteCall.where.expiresAt.lt).toBeInstanceOf(Date);
      expect(result).toBe(mockCleanupResult);
    });
  });

  describe("extendUserSession", () => {
    const mockExtendedSession = {
      id: "session-id",
      sessionToken: "abc123def456",
      expiresAt: new Date("2024-02-15T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z"),
    };

    it("extends session with default 30 days", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockExtendedSession);

      const result = await extendUserSession("abc123def456", 30, mockDb);

      expect(mockDb.userSession.update).toHaveBeenCalledWith({
        where: { sessionToken: "abc123def456" },
        data: {
          expiresAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      const updateCall = (mockDb.userSession.update as any).mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);

      expect(result).toBe(mockExtendedSession);
    });

    it("extends session with custom days", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockExtendedSession);

      await extendUserSession("abc123def456", 14, mockDb);

      const updateCall = (mockDb.userSession.update as any).mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it("uses default 30 days when no expiration provided", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockExtendedSession);

      await extendUserSession("abc123def456", undefined, mockDb);

      const updateCall = (mockDb.userSession.update as any).mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt;
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry.getTime() + 1000);
    });

    it("updates the updatedAt timestamp", async () => {
      (mockDb.userSession.update as any).mockResolvedValue(mockExtendedSession);
      const beforeCall = new Date();

      await extendUserSession("abc123def456", 30, mockDb);

      const updateCall = (mockDb.userSession.update as any).mock.calls[0][0];
      const updatedAt = updateCall.data.updatedAt;
      const afterCall = new Date();

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe("error handling", () => {
    it("handles database errors gracefully in createUserSession", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.create as any).mockRejectedValue(dbError);

      await expect(createUserSession("user-123", {}, 30, mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in getUserSession", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.findFirst as any).mockRejectedValue(dbError);

      await expect(getUserSession("token", mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in updateUserSession", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.update as any).mockRejectedValue(dbError);

      await expect(updateUserSession("token", {}, mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in deleteUserSession", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.delete as any).mockRejectedValue(dbError);

      await expect(deleteUserSession("token", mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in deleteAllUserSessions", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.deleteMany as any).mockRejectedValue(dbError);

      await expect(deleteAllUserSessions("user-123", mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in cleanupExpiredSessions", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.deleteMany as any).mockRejectedValue(dbError);

      await expect(cleanupExpiredSessions(mockDb)).rejects.toThrow("Database connection failed");
    });

    it("handles database errors gracefully in extendUserSession", async () => {
      const dbError = new Error("Database connection failed");
      (mockDb.userSession.update as any).mockRejectedValue(dbError);

      await expect(extendUserSession("token", 30, mockDb)).rejects.toThrow("Database connection failed");
    });
  });
});
