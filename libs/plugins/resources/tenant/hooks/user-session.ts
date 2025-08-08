import type { PrismaClient } from "@mmtm/database";
import { randomBytes } from "node:crypto";

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new user session
 */
export async function createUserSession(userId: string, sessionData: Record<string, any> = {}, expirationDays: number = 30, db: PrismaClient) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return await db.userSession.create({
    data: {
      userId,
      sessionToken,
      sessionData,
      expiresAt,
    },
  });
}

/**
 * Get user session by session token
 */
export async function getUserSession(sessionToken: string, db: PrismaClient) {
  return await db.userSession.findFirst({
    where: {
      sessionToken,
      expiresAt: {
        gt: new Date(), // Only return non-expired sessions
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
}

/**
 * Update session data
 */
export async function updateUserSession(sessionToken: string, sessionData: Record<string, any>, db: PrismaClient) {
  return await db.userSession.update({
    where: { sessionToken },
    data: {
      sessionData,
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a specific user session
 */
export async function deleteUserSession(sessionToken: string, db: PrismaClient) {
  return await db.userSession.delete({
    where: { sessionToken },
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string, db: PrismaClient) {
  return await db.userSession.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(db: PrismaClient) {
  return await db.userSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

/**
 * Extend session expiration
 */
export async function extendUserSession(sessionToken: string, expirationDays: number = 30, db: PrismaClient) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return await db.userSession.update({
    where: { sessionToken },
    data: {
      expiresAt,
      updatedAt: new Date(),
    },
  });
}
