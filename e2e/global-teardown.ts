import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  if (process.env.CI !== "true") {
    console.log("Stopping e2e test database...");
    execSync("docker compose down -v", {
      cwd: __dirname,
      stdio: "inherit",
    });
    console.log("E2E teardown complete.");
  }
}
