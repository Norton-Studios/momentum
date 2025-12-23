import { execSync } from "node:child_process";
import { TEST_DB_URL } from "./playwright.config";

export default async function globalSetup() {
  console.log("[global-setup] Resetting database for E2E tests...");

  try {
    // Reset database by dropping and recreating schema
    // This ensures a clean state for each test run (including retries)
    execSync(`DATABASE_URL="${TEST_DB_URL}" npx prisma db push --force-reset --skip-generate`, {
      stdio: "inherit",
    });

    console.log("[global-setup] Database reset complete");
  } catch (error) {
    console.error("[global-setup] Failed to reset database:", error);
    throw error;
  }
}
