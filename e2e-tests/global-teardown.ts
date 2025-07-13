import type { FullConfig } from '@playwright/test';
import { E2EEnvironment } from './utils/environment';

async function globalTeardown(_config: FullConfig) {
  console.log('🌍 Tearing down E2E environment...');
  
  try {
    // Stop the environment
    await E2EEnvironment.cleanup();
    
    // Clear environment variables
    delete process.env.E2E_API_URL;
    delete process.env.E2E_FRONTEND_URL;
    delete process.env.E2E_SYSTEM_ADMIN_TOKEN;
    delete process.env.TEST_USER_EMAIL;
    delete process.env.TEST_USER_PASSWORD;
    delete process.env.TEST_USER_API_TOKEN;
    delete process.env.TEST_TENANT_ID;
    delete process.env.TEST_TEAM_ID;
    delete process.env.TEST_TEAM_NAME;
    
    console.log('✅ E2E environment teardown completed');
    
  } catch (error) {
    console.error('❌ Teardown error (continuing):', error);
  }
}

export default globalTeardown;