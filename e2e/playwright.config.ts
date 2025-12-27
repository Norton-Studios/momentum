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
// Increase connection pool to handle concurrent import + test requests
export const TEST_DB_URL = "postgresql://momentum:momentum@localhost:5433/momentum?connection_limit=20";
export const TEST_PORT = isCI ? "3000" : "3001";
export const BASE_URL = `http://localhost:${TEST_PORT}`;

export default defineConfig({
  testDir: "./journeys",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "junit-results.xml" }],
  ],
  timeout: 30000, // 30 seconds per test

  globalTeardown: path.join(__dirname, "global-teardown.ts"),

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: {
      mode: "only-on-failure",
      fullPage: true,
    },
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
    command: isCI ? "yarn build && yarn start 2>&1 | tee test-results/server.log" : "yarn test:e2e:server 2>&1 | tee test-results/server.log",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120 * 1000, // 2 minutes for build + server startup in CI
    env: {
      DATABASE_URL: TEST_DB_URL,
      PORT: TEST_PORT,
    },
  },
});
