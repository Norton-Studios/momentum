# End-to-End Testing Plan

This document outlines the comprehensive E2E testing strategy for the Developer Productivity platform, including infrastructure setup, test orchestration, and test scenarios.

## Overview

The E2E testing system will use a complete integration approach:
1. Bootstrap PostgreSQL database using testcontainers
2. Run database migrations programmatically
3. Start API server with predefined test credentials
4. Start frontend application
5. Execute full user workflow tests including tenant creation and resource management

## Test Architecture

```mermaid
graph TD
    subgraph "E2E Test Setup"
        A[Start Testcontainers PostgreSQL] --> B[Run Prisma Migrations]
        B --> C[Start API Server with Test Config]
        C --> D[Start Frontend Application]
        D --> E[Execute Test Scenarios]
    end
    
    subgraph "Test Flow"
        E --> F[Create Tenant via System Admin API]
        F --> G[Login as Tenant Admin]
        G --> H[Create Team via API]
        H --> I[Create Repository via UI]
        I --> J[Verify Data Isolation]
        J --> K[Cleanup and Teardown]
    end
```

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Testcontainers Integration
- **Technology**: `@testcontainers/postgresql`
- **Purpose**: Spin up isolated PostgreSQL instances for each test run
- **Configuration**: 
  - PostgreSQL 15+ with required extensions
  - Isolated port allocation
  - Automatic cleanup after tests

#### 1.2 Programmatic Migration Runner
- **Technology**: Prisma CLI programmatic API
- **Purpose**: Run database migrations without CLI dependency
- **Implementation**: 
  - Custom migration runner using `@prisma/migrate`
  - Schema synthesis before migration
  - Migration status verification

#### 1.3 Test Configuration Management
- **Test System Admin Token**: `test-system-admin-token-12345` (clearly marked as test-only)
- **Environment Variables**: Isolated test environment configuration
- **Port Management**: Dynamic port allocation for parallel test execution

### Phase 2: Service Orchestration

#### 2.1 API Server Setup
```typescript
// Proposed structure
class E2ETestOrchestrator {
  private postgresContainer: PostgreSqlContainer
  private apiServer: Application
  private frontendProcess: ChildProcess
  
  async setup() {
    // 1. Start PostgreSQL container
    // 2. Run migrations
    // 3. Start API with test config
    // 4. Start frontend
    // 5. Wait for health checks
  }
  
  async teardown() {
    // Cleanup in reverse order
  }
}
```

#### 2.2 Frontend Integration
- **Technology**: Remix dev server
- **Configuration**: Point to test API endpoints
- **Health Checks**: Verify frontend is ready before tests

### Phase 3: Test Scenarios

#### 3.1 Core Workflow Test
```typescript
test('Complete tenant onboarding and team creation', async ({ page }) => {
  // 1. Create tenant via API
  const tenant = await createTestTenant()
  
  // 2. Login as tenant admin
  await page.goto('/login')
  await loginWithCredentials(page, tenant.admin.email, tenant.admin.password)
  
  // 3. Navigate to teams page
  await page.goto('/teams')
  
  // 4. Create new team via UI
  await page.click('[data-testid="create-team"]')
  await page.fill('[data-testid="team-name"]', 'Test Team')
  await page.click('[data-testid="submit"]')
  
  // 5. Verify team creation
  await expect(page.locator('[data-testid="team-list"]')).toContainText('Test Team')
  
  // 6. Verify API endpoint returns team
  const teams = await apiClient.get('/teams', { 
    headers: { Authorization: `Basic ${tenant.admin.apiToken}` }
  })
  expect(teams.data).toHaveLength(1)
  expect(teams.data[0].name).toBe('Test Team')
})
```

#### 3.2 Multi-Tenant Isolation Test
```typescript
test('Tenant data isolation', async ({ page }) => {
  // 1. Create two separate tenants
  const tenant1 = await createTestTenant('tenant1')
  const tenant2 = await createTestTenant('tenant2')
  
  // 2. Create team in tenant1
  await apiClient.post('/teams', 
    { name: 'Tenant 1 Team' },
    { headers: { Authorization: `Basic ${tenant1.admin.apiToken}` }}
  )
  
  // 3. Verify tenant2 cannot see tenant1's data
  const tenant2Teams = await apiClient.get('/teams', {
    headers: { Authorization: `Basic ${tenant2.admin.apiToken}` }
  })
  expect(tenant2Teams.data).toHaveLength(0)
  
  // 4. Verify via UI isolation
  await loginAsTenant(page, tenant2)
  await page.goto('/teams')
  await expect(page.locator('[data-testid="team-list"]')).toBeEmpty()
})
```

### Phase 4: Test Infrastructure Code

#### 4.1 Test Setup Utilities

```typescript
// e2e-tests/utils/test-orchestrator.ts
export class TestOrchestrator {
  private static instance: TestOrchestrator
  
  static async getInstance(): Promise<TestOrchestrator> {
    if (!this.instance) {
      this.instance = new TestOrchestrator()
      await this.instance.setup()
    }
    return this.instance
  }
  
  async createTestTenant(name?: string): Promise<TestTenant> {
    // Uses system admin token to create tenant
  }
  
  async runMigrations(databaseUrl: string): Promise<void> {
    // Programmatic migration execution
  }
}
```

#### 4.2 API Client Helper

```typescript
// e2e-tests/utils/api-client.ts
export class TestApiClient {
  constructor(private baseUrl: string) {}
  
  async createTenant(data: CreateTenantRequest): Promise<TenantResponse> {
    return this.post('/tenant', data, {
      headers: { 'x-system-admin-token': TEST_SYSTEM_ADMIN_TOKEN }
    })
  }
  
  async authenticatedRequest(token: string, method: string, path: string, data?: any) {
    // Helper for authenticated requests
  }
}
```

## Configuration Files

### Updated package.json
```json
{
  "name": "e2e-tests",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug"
  },
  "dependencies": {
    "@testcontainers/postgresql": "^10.7.2",
    "@prisma/client": "^5.11.0",
    "@prisma/migrate": "^5.11.0",
    "axios": "^1.6.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.3",
    "@types/node": "^22.10.5"
  }
}
```

### Updated playwright.config.ts
```typescript
export default defineConfig({
  testDir: "./tests",
  timeout: 60000, // Longer timeout for container setup
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || 'http://localhost:3000',
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
})
```

## Environment Variables for Tests

```bash
# e2e-tests/.env.test
DATABASE_URL="postgresql://test_user:test_pass@localhost:${DYNAMIC_PORT}/test_db"
SYSTEM_ADMIN_TOKEN="test-system-admin-token-12345"
E2E_API_URL="http://localhost:3001"
E2E_FRONTEND_URL="http://localhost:3000"
NODE_ENV="test"
```

## Test File Structure

```
e2e-tests/
├── global-setup.ts                 # Start containers and services
├── global-teardown.ts             # Cleanup
├── utils/
│   ├── test-orchestrator.ts       # Main orchestration class
│   ├── api-client.ts              # API interaction helpers
│   ├── database-helpers.ts        # Migration and DB utilities
│   └── auth-helpers.ts            # Authentication utilities
├── fixtures/
│   ├── test-data.ts               # Test data generators
│   └── tenant-fixtures.ts         # Tenant creation helpers
└── tests/
    ├── auth.spec.ts               # Authentication flow tests
    ├── tenant-management.spec.ts   # Tenant creation and management
    ├── multi-tenancy.spec.ts      # Data isolation tests
    ├── team-management.spec.ts     # Team CRUD operations
    └── repository-management.spec.ts # Repository operations
```

## Security Considerations

1. **Test Token Identification**: All test tokens clearly marked with "test-" prefix
2. **Container Isolation**: Each test run uses fresh containers
3. **Data Cleanup**: Automatic cleanup of test data and containers
4. **Environment Separation**: Strict separation of test and production configurations
5. **Port Isolation**: Dynamic port allocation prevents conflicts

## Performance Considerations

1. **Container Reuse**: Option to reuse containers for faster local development
2. **Parallel Execution**: Tests designed for parallel execution where possible
3. **Resource Management**: Proper cleanup to prevent resource leaks
4. **Health Checks**: Efficient readiness probes for services

## Next Steps

1. **Implement TestOrchestrator class** with container management
2. **Create migration runner** using Prisma programmatic API
3. **Build API client helpers** for common operations
4. **Write core test scenarios** following the planned structure
5. **Set up CI/CD integration** with proper test reporting
6. **Add test data generators** for consistent test scenarios

## Success Criteria

- [ ] Tests can run in complete isolation
- [ ] Full tenant lifecycle can be tested end-to-end
- [ ] Multi-tenant data isolation is verified
- [ ] Tests run consistently in CI/CD
- [ ] Test setup completes within 30 seconds
- [ ] All test containers are properly cleaned up
- [ ] Test results provide clear debugging information

This E2E testing approach ensures comprehensive coverage of the multi-tenant workflow while maintaining proper isolation and security practices.