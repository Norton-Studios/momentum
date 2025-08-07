import type { PrismaClient } from "@mmtm/database";
import { generateSecurePassword, generateApiToken, hashPassword } from "../lib/auth-utils.js";

/**
 * Validates that an organization name is available (not already taken)
 */
export async function validateOrganizationName(name: string, db: PrismaClient): Promise<boolean> {
  const existingTenant = await db.tenant.findUnique({
    where: { name },
  });
  return !existingTenant;
}

/**
 * Creates a new tenant with the specified organization name
 * Used by system admin endpoints
 */
export async function createTenant(_data: { organizationName: string; adminEmail: string }) {
  // This is a placeholder for system admin tenant creation
  // In the real implementation, this would create the tenant with admin user
  const adminPassword = generateSecurePassword();
  const hashedPassword = await hashPassword(adminPassword);
  const apiToken = generateApiToken();

  return { adminPassword, hashedPassword, apiToken };
}
