import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserAccount, type CreateUserAccountData } from "./user-account";
import type { PrismaClient } from "@mmtm/database";

// Mock the PrismaClient
const mockDb = {
  tenant: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

describe("user-account hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUserAccount", () => {
    const mockUserData: CreateUserAccountData = {
      organizationName: "test-org",
      fullName: "John Doe",
      email: "john@test.com",
      password: "SecurePassword123!",
    };

    const mockCreatedTenant = {
      id: "tenant-id",
      name: "test-org",
      users: [
        {
          id: "user-id",
          email: "john@test.com",
          fullName: "John Doe",
          apiToken: "api-token-123",
        },
      ],
      onboardingProgress: {
        id: "progress-id",
        tenantId: "tenant-id",
        currentStep: "data-sources",
        completedSteps: ["signup"],
        wizardData: {
          organizationName: "test-org",
          adminName: "John Doe",
          adminEmail: "john@test.com",
        },
        completed: false,
      },
    };

    it("creates tenant with user and onboarding progress", async () => {
      (mockDb.tenant.create as any).mockResolvedValue(mockCreatedTenant);

      const result = await createUserAccount(mockUserData, mockDb);

      expect(mockDb.tenant.create).toHaveBeenCalledWith({
        data: {
          name: "test-org",
          users: {
            create: {
              email: "john@test.com",
              fullName: "John Doe",
              password: expect.any(String), // hashed password
              apiToken: expect.any(String),
              role: "ADMIN",
            },
          },
          onboardingProgress: {
            create: {
              currentStep: "data-sources",
              completedSteps: ["signup"],
              wizardData: {
                organizationName: "test-org",
                adminName: "John Doe",
                adminEmail: "john@test.com",
              },
            },
          },
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              fullName: true,
              apiToken: true,
            },
          },
          onboardingProgress: true,
        },
      });

      expect(result).toEqual(mockCreatedTenant);
    });

    it("hashes the password", async () => {
      (mockDb.tenant.create as any).mockResolvedValue(mockCreatedTenant);

      await createUserAccount(mockUserData, mockDb);

      const createCall = (mockDb.tenant.create as any).mock.calls[0][0];
      const hashedPassword = createCall.data.users.create.password;

      // Password should be hashed, not plaintext
      expect(hashedPassword).not.toBe(mockUserData.password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
      expect(hashedPassword.startsWith("$2")).toBe(true); // bcrypt format
    });

    it("generates a unique API token", async () => {
      (mockDb.tenant.create as any).mockResolvedValue(mockCreatedTenant);

      await createUserAccount(mockUserData, mockDb);

      const createCall = (mockDb.tenant.create as any).mock.calls[0][0];
      const apiToken = createCall.data.users.create.apiToken;

      expect(apiToken).toMatch(/^[a-f0-9]{64}$/); // 64 character hex string
    });

    it("sets up onboarding progress correctly", async () => {
      (mockDb.tenant.create as any).mockResolvedValue(mockCreatedTenant);

      await createUserAccount(mockUserData, mockDb);

      const createCall = (mockDb.tenant.create as any).mock.calls[0][0];
      const onboardingData = createCall.data.onboardingProgress.create;

      expect(onboardingData).toEqual({
        currentStep: "data-sources",
        completedSteps: ["signup"],
        wizardData: {
          organizationName: "test-org",
          adminName: "John Doe",
          adminEmail: "john@test.com",
        },
      });
    });

    it("creates admin user", async () => {
      (mockDb.tenant.create as any).mockResolvedValue(mockCreatedTenant);

      await createUserAccount(mockUserData, mockDb);

      const createCall = (mockDb.tenant.create as any).mock.calls[0][0];
      const userData = createCall.data.users.create;

      expect(userData.role).toBe("ADMIN");
      expect(userData.email).toBe("john@test.com");
      expect(userData.fullName).toBe("John Doe");
    });
  });
});
