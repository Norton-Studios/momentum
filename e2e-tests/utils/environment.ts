import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ChildProcess, spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EnvironmentState {
  databaseUrl: string;
  apiUrl: string;
  frontendUrl: string;
  systemAdminToken: string;
}

export class E2EEnvironment {
  private static instance: E2EEnvironment | null = null;
  
  private postgresContainer: StartedPostgreSqlContainer | null = null;
  private apiProcess: ChildProcess | null = null;
  private frontendProcess: ChildProcess | null = null;
  
  private readonly SYSTEM_ADMIN_TOKEN = 'test-system-admin-token-12345';
  private readonly API_PORT = 3001;
  private readonly FRONTEND_PORT = 3000;
  
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
      console.log('📍 Environment already running');
      return this.state;
    }
    
    console.log('🚀 Starting E2E environment...');
    
    try {
      await this.startPostgreSQL();
      await this.runMigrations();
      await this.startAPI();
      await this.startFrontend();
      
      this.state = {
        databaseUrl: process.env.DATABASE_URL!,
        apiUrl: `http://localhost:${this.API_PORT}`,
        frontendUrl: `http://localhost:${this.FRONTEND_PORT}`,
        systemAdminToken: this.SYSTEM_ADMIN_TOKEN
      };
      
      console.log('✅ E2E environment ready!');
      console.log(`📍 API: ${this.state.apiUrl}`);
      console.log(`📍 Frontend: ${this.state.frontendUrl}`);
      
      if (options.keepAlive) {
        this.setupGracefulShutdown();
      }
      
      return this.state;
      
    } catch (error) {
      console.error('❌ Environment startup failed:', error);
      await this.stop();
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    console.log('🧹 Stopping E2E environment...');
    
    if (this.frontendProcess) {
      console.log('🛑 Stopping frontend...');
      this.frontendProcess.kill('SIGTERM');
      await this.waitForProcessExit(this.frontendProcess, 5000);
      this.frontendProcess = null;
    }
    
    if (this.apiProcess) {
      console.log('🛑 Stopping API...');
      this.apiProcess.kill('SIGTERM');
      await this.waitForProcessExit(this.apiProcess, 5000);
      this.apiProcess = null;
    }
    
    if (this.postgresContainer) {
      console.log('🛑 Stopping PostgreSQL...');
      try {
        await this.postgresContainer.stop();
      } catch (error) {
        console.warn('⚠️ Error stopping PostgreSQL container:', error);
      }
      this.postgresContainer = null;
    }
    
    this.state = null;
    console.log('✅ Environment stopped');
  }
  
  getState(): EnvironmentState | null {
    return this.state;
  }
  
  private async startPostgreSQL(): Promise<void> {
    console.log('🐘 Starting PostgreSQL container...');
    
    this.postgresContainer = await new PostgreSqlContainer()
      .withDatabase('e2e_test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();
    
    const databaseUrl = this.postgresContainer.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.E2E_DATABASE_URL = databaseUrl;
    
    console.log('✅ PostgreSQL container started');
  }
  
  private async runMigrations(): Promise<void> {
    console.log('📊 Running database migrations...');
    
    const projectRoot = process.cwd().replace('/e2e-tests', '');
    
    try {
      console.log('📋 Synthesizing schema...');
      await execAsync('yarn workspace @developer-productivity/database run synthesise', { 
        cwd: projectRoot,
        env: process.env
      });
      
      console.log('🔧 Generating Prisma client...');
      await execAsync('yarn workspace @developer-productivity/database run generate', { 
        cwd: projectRoot,
        env: process.env
      });
      
      console.log('🚀 Deploying schema...');
      await execAsync('npx prisma db push --schema=../apps/database/build/schema.prisma --force-reset', {
        cwd: process.cwd(),
        env: process.env
      });
      
      console.log('✅ Database migrations completed');
    } catch (error) {
      throw new Error(`Migration failed: ${error}`);
    }
  }
  
  private async startAPI(): Promise<void> {
    console.log('🔧 Starting API server...');
    
    return new Promise((resolve, reject) => {
      const projectRoot = process.cwd().replace('/e2e-tests', '');
      
      this.apiProcess = spawn('yarn', ['workspace', '@developer-productivity/api', 'run', 'dev'], {
        cwd: projectRoot,
        env: {
          ...process.env,
          SYSTEM_ADMIN_TOKEN: this.SYSTEM_ADMIN_TOKEN,
          PORT: this.API_PORT.toString(),
          NODE_ENV: 'test',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let apiReady = false;
      const timeout = setTimeout(() => {
        if (!apiReady) {
          reject(new Error('API server failed to start within timeout'));
        }
      }, 60000);
      
      this.apiProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG) console.log('API:', output.trim());
        
        if (output.includes(`Local:   http://localhost:${this.API_PORT}`) || 
            output.includes('ready') || 
            output.includes('listening')) {
          apiReady = true;
          clearTimeout(timeout);
          console.log('✅ API server started');
          resolve();
        }
      });
      
      this.apiProcess.stderr?.on('data', (data) => {
        if (process.env.DEBUG) console.log('API Error:', data.toString().trim());
      });
      
      this.apiProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  
  private async startFrontend(): Promise<void> {
    console.log('🎨 Starting frontend server...');
    
    return new Promise((resolve, reject) => {
      const projectRoot = process.cwd().replace('/e2e-tests', '');
      
      this.frontendProcess = spawn('yarn', ['workspace', '@developer-productivity/frontend', 'run', 'dev'], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PORT: this.FRONTEND_PORT.toString(),
          NODE_ENV: 'test',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let frontendReady = false;
      const timeout = setTimeout(() => {
        if (!frontendReady) {
          console.log('⚠️ Frontend took longer than expected, continuing...');
          resolve();
        }
      }, 60000);
      
      this.frontendProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (process.env.DEBUG) console.log('Frontend:', output.trim());
        
        if (output.includes(`http://localhost:${this.FRONTEND_PORT}`) || 
            output.includes('ready') || 
            output.includes('Local:')) {
          frontendReady = true;
          clearTimeout(timeout);
          console.log('✅ Frontend server started');
          resolve();
        }
      });
      
      this.frontendProcess.stderr?.on('data', (data) => {
        if (process.env.DEBUG) console.log('Frontend Error:', data.toString().trim());
      });
      
      this.frontendProcess.on('error', (error) => {
        console.log('⚠️ Frontend startup error (continuing):', error.message);
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  private setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received shutdown signal...');
      await this.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received termination signal...');
      await this.stop();
      process.exit(0);
    });
  }
  
  private waitForProcessExit(process: ChildProcess, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
        resolve();
      }, timeoutMs);
      
      process.on('exit', () => {
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