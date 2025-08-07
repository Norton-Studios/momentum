import type { PrismaClient } from "@mmtm/database";

/**
 * Retrieves the current onboarding progress for a tenant
 */
export async function getOnboardingProgress(tenantId: string, db: PrismaClient) {
  return await db.onboardingProgress.findUnique({
    where: { tenantId },
  });
}

/**
 * Updates the onboarding progress for a tenant
 */
export async function updateOnboardingProgress(tenantId: string, step: string, completedSteps: string[], wizardData: any, db: PrismaClient) {
  return await db.onboardingProgress.upsert({
    where: { tenantId },
    update: {
      currentStep: step,
      completedSteps,
      wizardData,
    },
    create: {
      tenantId,
      currentStep: step,
      completedSteps,
      wizardData,
    },
  });
}

/**
 * Marks the onboarding process as completed for a tenant
 */
export async function completeOnboarding(tenantId: string, db: PrismaClient) {
  return await db.onboardingProgress.update({
    where: { tenantId },
    data: {
      completed: true,
      currentStep: "completed",
    },
  });
}
