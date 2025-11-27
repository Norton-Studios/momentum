import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const isCI = process.env.CI === "true";

const LOCAL_DB_URL = "postgresql://momentum_test:momentum_test@localhost:5433/momentum_test";
const CI_DB_URL = "postgresql://momentum:momentum@localhost:5432/momentum";
const TEST_DB_URL = isCI ? CI_DB_URL : LOCAL_DB_URL;

export default async function globalSetup() {
  const envPath = path.join(__dirname, ".env");
  if (existsSync(envPath)) {
    config({ path: envPath });
  }

  if (!isCI) {
    console.log("Starting e2e test database...");
    execSync("docker compose up -d --wait", {
      cwd: __dirname,
      stdio: "inherit",
    });
  }

  console.log("Running database migrations...");
  execSync("npx prisma db push --skip-generate", {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });

  console.log("E2E setup complete.");
}
