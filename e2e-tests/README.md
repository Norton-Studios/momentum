# E2E Tests

End-to-end tests for the Developer Productivity platform with integrated environment management.

## Quick Start

Just run the tests - they handle everything automatically:

```bash
yarn test:e2e
```

This will:
1. Start PostgreSQL testcontainer
2. Run database migrations
3. Start API and frontend servers
4. Create test tenant and data
5. Run all tests
6. Clean up everything

## Development Mode

For development, you can start the environment manually and keep it running:

```bash
yarn bootstrap
```

Then run tests repeatedly:
```bash
yarn test:e2e
```

The bootstrap script keeps services running until you press Ctrl+C.

## How it works

### Integrated Mode (`yarn test:e2e`)
- **Global Setup**: Starts environment + creates test data
- **Tests**: Run against the live environment
- **Global Teardown**: Stops all services and containers

### Development Mode (`yarn bootstrap` + `yarn test:e2e`)
- **Bootstrap**: Starts environment and keeps it running
- **Tests**: Skip environment startup (faster iteration)

## Test Environment

- **API**: http://localhost:3001
- **Frontend**: http://localhost:3000
- **System Admin Token**: `test-system-admin-token-12345`
- **Database**: PostgreSQL testcontainer (dynamic port)

## API Authentication & Endpoints

### System Admin Endpoints
- Use `x-system-admin-token` header for authentication
- **POST /tenant** - Create tenant (system admin only)

### Standard Endpoints
- Use Basic Auth with API token as username/password
- **POST /team** - Create team
- **GET /teams** - List teams
- **GET /team/:id** - Get team by ID
- All other endpoints follow this pattern

## Test Data

Automatically created in global setup:
- Test tenant: `e2e-test-tenant`
- Admin user: `admin@e2e-test-tenant.test`
- Test team: `E2E Test Team`

Available in tests via environment variables:
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD` 
- `TEST_USER_API_TOKEN`
- `TEST_TENANT_ID`
- `TEST_TEAM_ID`

## Architecture

```
┌─────────────────┐
│  yarn test:e2e  │
└─────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │      Global Setup                │
    │  1. Start PostgreSQL container   │
    │  2. Run migrations              │
    │  3. Start API server            │
    │  4. Start frontend              │
    │  5. Create test tenant/user     │
    │  6. Create test team            │
    └────┬─────────────────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │         Run Tests                │
    │  - Use environment variables     │
    │  - Test API and frontend         │
    │  - Verify tenant isolation       │
    └────┬─────────────────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │      Global Teardown             │
    │  1. Stop API server             │
    │  2. Stop frontend               │
    │  3. Stop PostgreSQL container   │
    │  4. Clean up environment        │
    └──────────────────────────────────┘
```

## Files

```
e2e-tests/
├── utils/
│   ├── environment.ts      # Shared environment management
│   ├── bootstrap.ts        # Development bootstrap script
│   └── test-api.ts         # Simple API client
├── tests/
│   └── basic.spec.ts       # Basic E2E tests
├── global-setup.ts         # Start environment + create test data
├── global-teardown.ts      # Stop environment + cleanup
└── playwright.config.ts    # Playwright configuration
```

## Commands

```bash
# Run tests (recommended)
yarn test:e2e

# Development mode
yarn bootstrap    # Start and keep environment running
yarn test:e2e    # Run tests against running environment

# Debug tests
yarn test:debug
```