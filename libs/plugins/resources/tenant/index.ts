// Re-export the reusable functions from the hooks module
export {
  createTenant,
  validateOrganizationName,
  createUserAccount,
  getOnboardingProgress,
  updateOnboardingProgress,
  completeOnboarding,
  createUserSession,
  getUserSession,
  updateUserSession,
  deleteUserSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  extendUserSession,
  type CreateUserAccountData,
} from "./hooks/index.js";

// Re-export the router as default
export { default } from "./api/index.js";
