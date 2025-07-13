import type { FullConfig } from '@playwright/test';
import { E2EEnvironment } from './utils/environment';
import { TestAPI } from './utils/test-api';

async function globalSetup(_config: FullConfig) {
  console.log('🌍 Starting E2E environment and test data setup...');
  
  // Start the environment
  const environment = await E2EEnvironment.getInstance();
  const state = await environment.start();
  
  console.log('✅ Environment started');
  
  // Create test data
  const api = new TestAPI();
  
  console.log('👤 Creating test tenant and user...');
  const testUser = await api.createTestTenant('e2e-test-tenant');
  
  console.log('👥 Creating test team...');
  const testTeam = await api.createTeam(testUser, 'E2E Test Team');
  
  // Store environment and test data for tests
  process.env.E2E_API_URL = state.apiUrl;
  process.env.E2E_FRONTEND_URL = state.frontendUrl;
  process.env.E2E_SYSTEM_ADMIN_TOKEN = state.systemAdminToken;
  
  process.env.TEST_USER_EMAIL = testUser.email;
  process.env.TEST_USER_PASSWORD = testUser.password;
  process.env.TEST_USER_API_TOKEN = testUser.apiToken;
  process.env.TEST_TENANT_ID = testUser.tenantId;
  process.env.TEST_TEAM_ID = testTeam.id;
  process.env.TEST_TEAM_NAME = testTeam.name;
  
  console.log('✅ Test environment and data ready:', {
    apiUrl: state.apiUrl,
    tenantId: testUser.tenantId,
    teamName: testTeam.name
  });
}

export default globalSetup;