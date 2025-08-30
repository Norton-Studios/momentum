import type { PrismaClient } from "@mmtm/database";
import { generateApiToken, hashPassword } from "../lib/auth-utils.js";

export interface CreateUserAccountData {
  organizationName: string;
  fullName: string;
  email: string;
  password: string;
}

/**
 * Creates a new user account with tenant and onboarding progress
 * Used for self-service signup
 */
export async function createUserAccount(data: CreateUserAccountData, db: PrismaClient) {
  const hashedPassword = await hashPassword(data.password);
  const apiToken = generateApiToken();

  const tenant = await db.tenant.create({
    data: {
      name: data.organizationName,
      users: {
        create: {
          email: data.email,
          fullName: data.fullName,
          password: hashedPassword,
          apiToken,
          role: "ADMIN",
        },
      },
      onboardingProgress: {
        create: {
          currentStep: "data-sources",
          completedSteps: ["signup"],
          wizardData: {
            organizationName: data.organizationName,
            adminName: data.fullName,
            adminEmail: data.email,
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

  return tenant;
}
