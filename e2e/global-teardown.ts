import { execSync } from "child_process";

export default function globalTeardown() {
  try {
    execSync("docker compose -f e2e/docker-compose.yml down");
  } catch (error) {
    console.error(`Exception during global teardown: ${error}`);
  }
}
