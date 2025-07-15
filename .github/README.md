# GitHub Actions CI/CD

This repository uses [Turborepo](https://turborepo.com/) for optimized monorepo testing and builds.

## How It Works

### Dependency-Based Testing

The CI automatically determines what needs testing based on:

1. **Changed Files Detection**: Uses git diff to find changes since base branch
2. **Dependency Graph**: Turborepo analyzes `package.json` workspace dependencies 
3. **Affected Packages**: Only runs tests for changed packages and their dependents

### Example Scenarios

**Scenario 1: Change a Plugin**
```bash
# If you modify plugins/resources/team/api/index.ts
# Only runs: team plugin lint + unit tests
```

**Scenario 2: Change Database Schema** 
```bash
# If you modify apps/database/prisma/schema.prisma 
# Runs: database tests + ALL plugin tests (they depend on database)
```

**Scenario 3: Change API Core**
```bash
# If you modify apps/api/src/index.ts
# Runs: API tests + any tests that depend on API
```

## Workflows

### `test.yml` - Main Testing Workflow

**Triggers**: PRs and pushes to master/main

**3 Parallel Jobs**:

#### 1. **Lint Job** (Fast & Clean)
- **Purpose**: Code style and quality checks
- **Runtime**: ~30-60 seconds
- **Setup**: Minimal - just dependencies
- **Command**: `turbo lint --filter="...[origin/base_branch]"`

#### 2. **Test Job** (Unit Tests Only)
- **Purpose**: Fast unit tests for business logic
- **Runtime**: ~1-2 minutes  
- **Setup**: Minimal - just dependencies (no database!)
- **Command**: `turbo test --filter="...[origin/base_branch]"`
- **Note**: These are true unit tests - isolated from infrastructure

#### 3. **E2E Job** (Integration Tests)
- **Purpose**: Full end-to-end integration testing
- **Runtime**: ~3-5 minutes
- **Setup**: Complete environment via testcontainers
- **Frequency**: Always runs on PRs
- **Features**: Database, API, Frontend, real workflows

## Test Types & Philosophy

### Unit Tests (Vitest)
- **Location**: Co-located with source files (`*.test.ts`)
- **Purpose**: Test business logic in isolation
- **Setup**: No external dependencies (database, APIs, etc.)
- **Speed**: Very fast (milliseconds per test)
- **Mocking**: Mock external services with `vi.mock()`

### E2E Tests (Playwright)
- **Location**: `e2e-tests/` directory
- **Purpose**: Test complete user workflows
- **Setup**: Full environment with real database
- **Speed**: Slower but comprehensive
- **Isolation**: Uses testcontainers for clean environments

## Caching Strategy

Turborepo provides optimized caching with separate cache keys:

1. **Lint Cache**: `turbo-lint-{sha}` - Based on source files and config
2. **Test Cache**: `turbo-test-{sha}` - Based on source files and test files  
3. **Local Cache**: Stores task results in `.turbo/` (gitignored)
4. **Remote Cache**: GitHub Actions cache for CI speedup

## Performance Benefits

- **True Parallelism**: Lint, test, and E2E run simultaneously
- **Incremental Testing**: Only test what changed via dependency graph
- **Cache Hits**: Skip tests that ran before with same inputs
- **Fast Feedback**: Unit tests provide immediate results (~1-2 min)
- **Infrastructure Separation**: Unit tests don't wait for database startup

## Local Development

```bash
# Run all tests (unit tests only)
yarn test

# Run tests for changed files only  
yarn test:changed

# Run lint for changed files
yarn lint:changed

# Run specific package tests
npx turbo test --filter=@mmtm/resource-team

# Run tests with dependencies
npx turbo test --filter=...@mmtm/database

# Run E2E tests
yarn workspace e2e-tests run test
```

## PR Workflow Summary

When you open a PR, 3 jobs run in parallel:

```bash
🔍 Lint Job      → turbo lint --filter="...[origin/master]"    (~30-60s)
🧪 Test Job      → turbo test --filter="...[origin/master]"    (~1-2min)  
🌍 E2E Job       → Full integration tests                      (~3-5min)
```

**Total PR feedback time**: ~3-5 minutes (limited by E2E, not unit tests)

## Configuration Files

- `turbo.json`: Task pipeline and caching configuration
- `.github/workflows/test.yml`: 3-job parallel workflow
- `package.json`: Turborepo scripts and workspace configuration

## Adding New Packages

When you add a new package:

1. Turborepo automatically detects it (no config changes needed)
2. Add `"test": "vitest run"` script for unit tests
3. Add `"lint": "biome lint ."` script for linting
4. Tests will be included in dependency graph automatically
5. CI will run lint/tests when package or dependencies change

## Debugging

View what Turborepo would run:
```bash
npx turbo test --dry-run
npx turbo test --filter='...[HEAD^1]' --dry-run
npx turbo lint --dry-run
```

View dependency graph:
```bash
npx turbo run test --graph
```

## Best Practices

### Unit Tests
- Mock external dependencies with `vi.mock()`
- Test business logic, not infrastructure
- Keep tests fast and isolated
- Co-locate with source files

### E2E Tests  
- Test real user workflows
- Use testcontainers for isolation
- Focus on integration scenarios
- Keep minimal but comprehensive