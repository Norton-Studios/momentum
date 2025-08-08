import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateOrganizationName, createTenant } from "./organization";
import type { PrismaClient } from "@mmtm/database";

// Mock the PrismaClient
const mockDb = {
  tenant: {
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;

describe("organization hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateOrganizationName", () => {
    it("returns true when organization name is available", async () => {
      (mockDb.tenant.findUnique as any).mockResolvedValue(null);

      const result = await validateOrganizationName("available-org", mockDb);

      expect(result).toBe(true);
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
        where: { name: "available-org" },
      });
    });

    it("returns false when organization name is already taken", async () => {
      (mockDb.tenant.findUnique as any).mockResolvedValue({
        id: "existing-tenant-id",
        name: "taken-org",
      });

      const result = await validateOrganizationName("taken-org", mockDb);

      expect(result).toBe(false);
      expect(mockDb.tenant.findUnique).toHaveBeenCalledWith({
        where: { name: "taken-org" },
      });
    });
  });

  describe("createTenant", () => {
    it("generates secure credentials for new tenant", async () => {
      const result = await createTenant({
        organizationName: "test-org",
        adminEmail: "admin@test.com",
      });

      expect(result).toHaveProperty("adminPassword");
      expect(result).toHaveProperty("hashedPassword");
      expect(result).toHaveProperty("apiToken");

      // Verify password requirements
      expect(result.adminPassword).toMatch(/[a-z]/); // lowercase
      expect(result.adminPassword).toMatch(/[A-Z]/); // uppercase
      expect(result.adminPassword).toMatch(/\d/); // number
      expect(result.adminPassword).toMatch(/[!@#$%^&*()_+\-=]/); // special char
      expect(result.adminPassword.length).toBe(16);

      // Verify API token format
      expect(result.apiToken).toMatch(/^[a-f0-9]{64}$/);

      // Verify password is hashed
      expect(result.hashedPassword).not.toBe(result.adminPassword);
      expect(result.hashedPassword.length).toBeGreaterThan(50);
    });

    it("generates different passwords and tokens each time", async () => {
      const result1 = await createTenant({
        organizationName: "test-org-1",
        adminEmail: "admin1@test.com",
      });

      const result2 = await createTenant({
        organizationName: "test-org-2",
        adminEmail: "admin2@test.com",
      });

      expect(result1.adminPassword).not.toBe(result2.adminPassword);
      expect(result1.hashedPassword).not.toBe(result2.hashedPassword);
      expect(result1.apiToken).not.toBe(result2.apiToken);
    });
  });
});
