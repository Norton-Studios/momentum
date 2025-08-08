import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { type ChildProcess, spawn } from "node:child_process";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface EnvironmentState {
  databaseUrl: string;
  apiUrl: string;
  dashboardUrl: string;
  systemAdminToken: string;
}

export class E2EEnvironment {
  private static instance: E2EEnvironment | null = null;

  private postgresContainer: StartedPostgreSqlContainer | null = null;
  private apiProcess: ChildProcess | null = null;
  private dashboardProcess: ChildProcess | null = null;

  private readonly SYSTEM_ADMIN_TOKEN = "test-system-admin-token-12345";
  private readonly API_PORT = 3001;
  private readonly DASHBOARD_PORT = 3000;

  private state: EnvironmentState | null = null;

  // Singleton pattern for shared state
  static async getInstance(): Promise<E2EEnvironment> {
    if (!E2EEnvironment.instance) {
      E2EEnvironment.instance = new E2EEnvironment();
    }
    return E2EEnvironment.instance;
  }

  async start(options: { keepAlive?: boolean } = {}): Promise<EnvironmentState> {
    if (this.state) {
      console.log("📍 Environment already running");
      return this.state;
    }

    console.log("🚀 Starting E2E environment...");

    try {
      await this.startPostgreSQL();
      await this.runMigrations();
      await this.startAPI();
      await this.startDashboard();

      this.state = {
        databaseUrl: process.env.DATABASE_URL!,
        apiUrl: `http://localhost:${this.API_PORT}`,
        dashboardUrl: `http://localhost:${this.DASHBOARD_PORT}`,
        systemAdminToken: this.SYSTEM_ADMIN_TOKEN,
      };

      // Set environment variables for tests
      process.env.E2E_FRONTEND_URL = this.state.dashboardUrl;
      process.env.E2E_API_URL = this.state.apiUrl;

      console.log("✅ E2E environment ready!");
      console.log(`📍 API: ${this.state.apiUrl}`);
      console.log(`📍 Dashboard: ${this.state.dashboardUrl}`);

      if (options.keepAlive) {
        this.setupGracefulShutdown();
      }

      return this.state;
    } catch (error) {
      console.error("❌ Environment startup failed:", error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("🧹 Stopping E2E environment...");

    if (this.dashboardProcess) {
      console.log("🛑 Stopping dashboard...");
      this.dashboardProcess.kill("SIGTERM");
      await this.waitForProcessExit(this.dashboardProcess, 5000);
      this.dashboardProcess = null;
    }

    if (this.apiProcess) {
      console.log("🛑 Stopping API...");
      this.apiProcess.kill("SIGTERM");
      await this.waitForProcessExit(this.apiProcess, 5000);
      this.apiProcess = null;
    }

    if (this.postgresContainer) {
      console.log("🛑 Stopping PostgreSQL...");
      try {
        await this.postgresContainer.stop();
      } catch (error) {
        console.warn("⚠️ Error stopping PostgreSQL container:", error);
      }
      this.postgresContainer = null;
    }

    this.state = null;
    console.log("✅ Environment stopped");
  }

  getState(): EnvironmentState | null {
    return this.state;
  }

  private async startPostgreSQL(): Promise<void> {
    console.log("🐘 Starting PostgreSQL container...");

    this.postgresContainer = await new PostgreSqlContainer("postgres:15-alpine")
      .withDatabase("e2e_test_db")
      .withUsername("test_user")
      .withPassword("test_password")
      .withExposedPorts(5432)
      .start();

    const databaseUrl = this.postgresContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.E2E_DATABASE_URL = databaseUrl;

    console.log("✅ PostgreSQL container started");
  }

  private async runMigrations(): Promise<void> {
    console.log("📊 Running database migrations...");

    const projectRoot = process.cwd().replace("/e2e-tests", "");

    try {
      console.log("📋 Synthesizing schema...");
      await execAsync("yarn workspace @mmtm/database run synthesise", {
        cwd: projectRoot,
        env: process.env,
      });

      console.log("🔧 Generating Prisma client...");
      await execAsync("yarn workspace @mmtm/database run generate", {
        cwd: projectRoot,
        env: process.env,
      });

      console.log("🚀 Deploying schema...");
      await execAsync("npx prisma db push --schema=../apps/database/build/schema.prisma --force-reset", {
        cwd: process.cwd(),
        env: process.env,
      });

      console.log("✅ Database migrations completed");
    } catch (error) {
      throw new Error(`Migration failed: ${error}`);
    }
  }

  private async startAPI(): Promise<void> {
    console.log("🔧 Starting API server...");

    return new Promise((resolve, reject) => {
      const projectRoot = process.cwd().replace("/e2e-tests", "");

      this.apiProcess = spawn("yarn", ["workspace", "@mmtm/api", "run", "dev"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          SYSTEM_ADMIN_TOKEN: this.SYSTEM_ADMIN_TOKEN,
          PORT: this.API_PORT.toString(),
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let apiReady = false;
      const timeout = setTimeout(() => {
        if (!apiReady) {
          reject(new Error("API server failed to start within timeout"));
        }
      }, 60000);

      this.apiProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        if (process.env.DEBUG) console.log("API:", output.trim());

        if (output.includes(`Local:   http://localhost:${this.API_PORT}`) || output.includes("ready") || output.includes("listening")) {
          apiReady = true;
          clearTimeout(timeout);
          console.log("✅ API server started");
          resolve();
        }
      });

      this.apiProcess.stderr?.on("data", (data) => {
        if (process.env.DEBUG) console.log("API Error:", data.toString().trim());
      });

      this.apiProcess.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async startDashboard(): Promise<void> {
    console.log("🎨 Starting dashboard server...");

    return new Promise((resolve, _reject) => {
      const projectRoot = process.cwd().replace("/e2e-tests", "");

      this.dashboardProcess = spawn("yarn", ["workspace", "@mmtm/dashboard", "run", "dev"], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PORT: this.DASHBOARD_PORT.toString(),
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let dashboardReady = false;
      const timeout = setTimeout(() => {
        if (!dashboardReady) {
          console.log("⚠️ Dashboard took longer than expected, continuing...");
          resolve();
        }
      }, 60000);

      this.dashboardProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        if (process.env.DEBUG) console.log("Dashboard:", output.trim());

        if (output.includes(`http://localhost:${this.DASHBOARD_PORT}`) || output.includes("ready") || output.includes("Local:")) {
          dashboardReady = true;
          clearTimeout(timeout);
          console.log("✅ Dashboard server started");
          resolve();
        }
      });

      this.dashboardProcess.stderr?.on("data", (data) => {
        if (process.env.DEBUG) console.log("Dashboard Error:", data.toString().trim());
      });

      this.dashboardProcess.on("error", (error) => {
        console.log("⚠️ Dashboard startup error (continuing):", error.message);
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private setupGracefulShutdown(): void {
    process.on("SIGINT", async () => {
      console.log("\n🛑 Received shutdown signal...");
      await this.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\n🛑 Received termination signal...");
      await this.stop();
      process.exit(0);
    });
  }

  private waitForProcessExit(process: ChildProcess, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!process.killed) {
          process.kill("SIGKILL");
        }
        resolve();
      }, timeoutMs);

      process.on("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  static async cleanup(): Promise<void> {
    if (E2EEnvironment.instance) {
      await E2EEnvironment.instance.stop();
      E2EEnvironment.instance = null;
    }
  }
}
