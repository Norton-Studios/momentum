# ADR-006: End-to-End Testing Strategy

## Status
Proposed

## Context
The Developer Productivity platform requires comprehensive end-to-end testing to ensure the multi-tenant workflow functions correctly across all components. The testing needs to validate:

1. Complete service orchestration (database, API, frontend)
2. Tenant creation and authentication flows
3. Multi-tenant data isolation
4. Full user workflows from tenant setup to resource management

## Decision
We will implement a comprehensive E2E testing system using:

1. **Testcontainers** for isolated PostgreSQL instances
2. **Programmatic Prisma migrations** instead of CLI-based migrations
3. **Test orchestration class** to manage service lifecycle
4. **Playwright** for browser automation
5. **Predefined test credentials** with clear test-only markers

## Architecture

### Test Flow
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   API Server     │    │   Frontend      │
│  (Testcontainer)│◄───┤  (Test Config)   │◄───┤  (Test Mode)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                        ▲                       ▲
         │                        │                       │
    ┌────▼────────────────────────▼───────────────────────▼────┐
    │              Test Orchestrator                           │
    │  1. Start containers  4. Start API    7. Execute tests   │
    │  2. Run migrations    5. Start frontend                  │
    │  3. Wait for ready    6. Health checks                   │
    └──────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. TestOrchestrator Class
```typescript
class TestOrchestrator {
  // Manages complete test environment lifecycle
  // - PostgreSQL container management
  // - Service startup and health checking
  // - Test data creation and cleanup
}
```

#### 2. Test Configuration
```typescript
const TEST_CONFIG = {
  SYSTEM_ADMIN_TOKEN: 'test-system-admin-token-12345',
  DATABASE_NAME: 'e2e_test_db',
  API_PORT: 0, // Dynamic allocation
  FRONTEND_PORT: 0, // Dynamic allocation
}
```

#### 3. Test Scenarios
- **Tenant Creation Flow**: System admin → Create tenant → Verify admin user
- **Authentication Flow**: Login with tenant credentials → Verify context
- **Resource Management**: Create team/repository → Verify in API and UI
- **Data Isolation**: Multiple tenants → Verify separation

## Implementation Plan

### Phase 1: Infrastructure (1-2 days)
1. Add testcontainers dependencies
2. Create TestOrchestrator class
3. Implement programmatic migration runner
4. Set up test environment configuration

### Phase 2: Service Integration (1-2 days)
1. API server test mode setup
2. Frontend test configuration
3. Health check implementations
4. Service orchestration logic

### Phase 3: Test Implementation (2-3 days)
1. Core workflow tests
2. Multi-tenant isolation tests
3. Authentication flow tests
4. Error scenario tests

### Phase 4: CI/CD Integration (1 day)
1. GitHub Actions configuration
2. Test reporting setup
3. Performance optimization
4. Documentation completion

## Technology Choices

### Testcontainers
- **Why**: Provides true isolation with real PostgreSQL instances
- **Alternative considered**: In-memory database (rejected due to PostgreSQL-specific features)

### Programmatic Migrations
- **Why**: More reliable than CLI execution in test environment
- **Alternative considered**: CLI-based migrations (rejected due to complexity in container environments)

### Playwright
- **Why**: Already in use, excellent debugging tools
- **Alternative considered**: Cypress (rejected to maintain consistency)

## Test Data Strategy

### Tenant Creation
```typescript
const createTestTenant = async (name = 'test-tenant') => {
  const response = await apiClient.post('/tenant', {
    name,
    adminEmail: `admin@${name}.test`
  }, {
    headers: { 'x-system-admin-token': TEST_SYSTEM_ADMIN_TOKEN }
  })
  
  return {
    tenant: response.data.tenant,
    admin: response.data.admin // Includes generated password
  }
}
```

### Resource Management
```typescript
const createTestResources = async (tenantAuth) => {
  // Create team
  const team = await apiClient.post('/teams', {
    name: 'Test Team'
  }, { headers: { Authorization: tenantAuth } })
  
  // Create repository
  const repo = await apiClient.post('/repositories', {
    name: 'test-repo',
    url: 'https://github.com/test/repo'
  }, { headers: { Authorization: tenantAuth } })
  
  return { team, repo }
}
```

## Security Considerations

1. **Test Token Identification**: All test tokens prefixed with "test-"
2. **Container Isolation**: Each test run uses fresh containers
3. **Environment Separation**: Clear separation from production config
4. **Credential Management**: Generated credentials clearly marked as test-only

## Performance Targets

- **Test Setup**: < 30 seconds (including container start)
- **Test Execution**: < 5 minutes for full suite
- **Container Cleanup**: < 10 seconds
- **Memory Usage**: < 1GB per test run

## File Structure

```
e2e-tests/
├── global-setup.ts                 # Container and service initialization
├── global-teardown.ts             # Cleanup orchestration
├── utils/
│   ├── test-orchestrator.ts       # Main orchestration class
│   ├── api-client.ts              # API interaction helpers
│   ├── migration-runner.ts        # Programmatic migration execution
│   └── auth-helpers.ts            # Authentication utilities
├── fixtures/
│   ├── tenant-data.ts             # Tenant creation helpers
│   └── resource-data.ts           # Test resource generators
└── tests/
    ├── tenant-lifecycle.spec.ts    # Full tenant workflow
    ├── multi-tenancy.spec.ts      # Data isolation verification
    └── authentication.spec.ts      # Auth flow testing
```

## Success Metrics

- [ ] Tests run in complete isolation (no shared state)
- [ ] Full tenant workflow tested end-to-end
- [ ] Multi-tenant data isolation verified
- [ ] Tests pass consistently in CI/CD (>99% reliability)
- [ ] Test setup completes within performance targets
- [ ] Zero test infrastructure leaks (containers, processes)

## Alternatives Considered

### Database Strategy
1. **In-memory SQLite**: Rejected due to PostgreSQL-specific features
2. **Shared test database**: Rejected due to isolation concerns
3. **Docker Compose**: Rejected due to complexity and port conflicts

### Migration Strategy
1. **CLI-based migrations**: Rejected due to container execution complexity
2. **SQL file execution**: Rejected due to maintenance overhead
3. **Schema reset per test**: Rejected due to performance impact

## Consequences

### Positive
- Complete isolation ensures reliable tests
- Real PostgreSQL environment catches DB-specific issues
- Programmatic control over entire test environment
- Clear separation of test and production configurations

### Negative
- Slightly longer test setup time (containers)
- Additional complexity in test orchestration
- Resource overhead for container management
- Dependency on Docker for test execution

## Implementation Notes

1. **Container Management**: Use testcontainers auto-cleanup features
2. **Port Management**: Dynamic port allocation to prevent conflicts
3. **Health Checks**: Proper readiness verification before test execution
4. **Error Handling**: Graceful cleanup even when tests fail
5. **Debugging**: Preserve container logs for failed test investigation