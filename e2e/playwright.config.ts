import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables BEFORE test modules are parsed
const envPath = path.join(__dirname, ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

export const isCI = !!process.env.CI;
export const TEST_DB_URL = "postgresql://momentum:momentum@localhost:5433/momentum";
export const TEST_PORT = isCI ? "3000" : "3001";
export const BASE_URL = `http://localhost:${TEST_PORT}`;

export default defineConfig({
  testDir: "./journeys",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [["html"], ["junit", { outputFile: "junit-results.xml" }]],
  timeout: 10000, // 10 seconds per test

  globalTeardown: path.join(__dirname, "global-teardown.ts"),

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
      },
    },
  ],

  webServer: {
    command: isCI ? "yarn dev" : "yarn test:e2e:server",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 10 * 1000, // 10 seconds for dev server startup
    env: {
      DATABASE_URL: TEST_DB_URL,
      PORT: TEST_PORT,
    },
  },
});
