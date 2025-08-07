# Dashboard Onboarding: Data Source Configuration Simplification

## Summary

This document captures the technical decisions and implementation changes made during the dashboard onboarding feature development. The work involved two main areas: simplifying the data source configuration model by removing the `instanceId` field, and resolving infrastructure issues including E2E test linting errors and development workflow optimizations.

## Part 1: Data Source Configuration Simplification

### Context

During development of the dashboard onboarding flow, a question arose about the purpose and necessity of the `instanceId` field in the `TenantDataSourceConfig` model. After analysis, it was determined that this field was over-engineered without a clear use case.

### Key Technical Decisions

#### 1. Removal of instanceId Field

**Problem**: The `instanceId` field in `TenantDataSourceConfig` was designed to allow multiple instances of the same data source provider per tenant, but no clear use case existed for this complexity.

**Decision**: Remove the `instanceId` field entirely and simplify the data model to one configuration per data source provider per tenant.

**Rationale**:
- No identified use case for multiple instances of the same data source
- Added unnecessary complexity to the UI and API
- Simplified data model is easier to understand and maintain
- Single configuration per provider is sufficient for current requirements

#### 2. Systematic Cleanup Approach

The removal was implemented systematically across all layers:

1. **Database Schema** (`plugins/resources/tenant-data-source-config/db/schema.prisma`)
   - Removed `instanceId` field from model
   - Adjusted unique constraint to use only `tenantId` and `provider`

2. **API Layer** (`plugins/resources/tenant-data-source-config/api/index.ts`)
   - Removed PUT and DELETE endpoints (no longer needed with simplified model)
   - Updated POST endpoint to use upsert logic
   - Simplified query logic in GET endpoint

3. **Frontend Components**
   - Updated form handling to remove instanceId references
   - Simplified state management in configuration components

4. **Tests**
   - Removed test cases for deleted PUT/DELETE endpoints
   - Updated existing tests to reflect new data model
   - Fixed failing assertions related to instanceId

### Implementation Changes

#### Database Schema Changes

```prisma
// Before
model TenantDataSourceConfig {
  id         String @id @default(cuid())
  tenantId   String @map("tenant_id")
  provider   String
  instanceId String @map("instance_id")
  config     Json
  isActive   Boolean @default(true) @map("is_active")
  
  @@unique([tenantId, provider, instanceId])
  @@map("tenant_data_source_config")
}

// After
model TenantDataSourceConfig {
  id       String @id @default(cuid())
  tenantId String @map("tenant_id")
  provider String
  config   Json
  isActive Boolean @default(true) @map("is_active")
  
  @@unique([tenantId, provider])
  @@map("tenant_data_source_config")
}
```

#### API Endpoint Changes

- **Removed**: `PUT /tenant-data-source-config/:id` endpoint
- **Removed**: `DELETE /tenant-data-source-config/:id` endpoint
- **Modified**: `POST /tenant-data-source-config` now uses upsert pattern
- **Simplified**: `GET /tenant-data-source-config` query logic

#### Frontend Changes

- Removed instanceId from form data structures
- Simplified configuration component state management
- Updated API integration to use new endpoint pattern

### Infrastructure Improvements

#### Pre-commit Hook Optimization

Enhanced the pre-commit hook to use Turbo's intelligent filtering:

```bash
# Before: Ran tests/lint on entire codebase
yarn test
yarn lint:fix

# After: Only runs on changed packages
yarn test:changed
yarn lint:fix-changed
```

This significantly improves developer experience by reducing pre-commit time.

#### Pre-bash Hook Fix

Fixed undefined variable issue in pre-bash hook by properly parsing the JSON environment:

```bash
# Extract command from JSON environment
CLAUDE_FLOW_COMMAND=$(echo "$CLAUDE_FLOW" | jq -r '.command // empty')
```

#### Testing Documentation Enhancement

Added clear guidance for running tests on individual packages using Turbo:

```bash
# Run tests for specific package
yarn turbo test --filter=@mmtm/resource-tenant-data-source-config

# Run tests for packages affected by changes
yarn test:changed
```

### Migration Considerations

#### Database Migration Required

The removal of the `instanceId` field requires a database migration. The migration should:

1. Drop the old unique constraint
2. Remove the `instance_id` column
3. Add the new unique constraint on `(tenant_id, provider)`
4. Handle any potential data conflicts from multiple instances

#### Backward Compatibility

This is a breaking change that affects:
- API consumers expecting PUT/DELETE endpoints
- Any external integrations relying on instanceId
- Database queries that reference the instanceId field

### Benefits Achieved

1. **Simplified Data Model**: Reduced complexity in the data source configuration system
2. **Cleaner API**: Fewer endpoints with clearer semantics
3. **Better Performance**: Optimized pre-commit hooks reduce development friction
4. **Improved Tests**: More focused test coverage without unnecessary complexity
5. **Enhanced Documentation**: Clear guidance for package-specific testing

## Part 2: E2E Test Linting Fix

### Issue Description

During linting analysis of the codebase, unreachable code was detected in `/home/linus/Work/norton-studios/momentum/e2e-tests/tests/onboarding-flow.spec.ts`. The problem was in a test case that used both `test.skip()` to skip the test and contained an early return statement, making any code after the return unreachable.

### Root Cause

The issue was in the test structure where:
1. A test was marked as skipped using `test.skip()`
2. The test function still contained an early return statement
3. Any code after the return would be unreachable, triggering linting errors

### Solution

The fix involved restructuring the skipped test to follow proper Playwright testing patterns:

**Before (problematic):**
```typescript
test.skip("Complete user onboarding flow from dashboard redirect", async () => {
  return; // Early return making subsequent code unreachable
  // Any code here would be unreachable
});
```

**After (fixed):**
```typescript
test.skip("Complete user onboarding flow from dashboard redirect", async () => {
  // TODO: Re-enable this test once data source configuration is fully implemented
  // This test requires complex data source setup that isn't fully implemented yet
  console.log("Skipping complete onboarding flow test - data source configuration not fully implemented");
});
```

### Technical Details

- **File:** `e2e-tests/tests/onboarding-flow.spec.ts`
- **Testing Framework:** Playwright
- **Issue Type:** Unreachable code after early return
- **Linting Tool:** Biome (configured in the project)
- **Fix Type:** Structural refactoring of test case

### Test Suite Context

The onboarding flow E2E test suite includes:
- Sign-in page validation tests
- Sign-up page validation tests  
- Navigation flow testing between authentication pages
- Dashboard access control testing for unauthenticated users
- A placeholder for comprehensive onboarding flow testing (currently skipped)

### Best Practices Applied

1. **Proper Test Skipping:** Use `test.skip()` without early returns when the entire test should be bypassed
2. **Clear Documentation:** Include TODO comments explaining why tests are skipped
3. **Meaningful Logging:** Add console.log statements in skipped tests for debugging clarity
4. **Clean Code Structure:** Remove unreachable code patterns that trigger linting errors

## Overall Future Considerations

### Data Source Configuration

If multiple instances of the same data source provider are needed in the future, consider:

1. **Namespace-based approach**: Use a namespace field instead of generic instanceId
2. **Provider-specific configuration**: Allow providers to define their own multi-instance logic
3. **User-defined naming**: Let users name their configurations for better UX

### E2E Testing

The skipped test is intended to be re-enabled once the data source configuration functionality is fully implemented. The test structure is now ready for proper implementation when the underlying features are complete.

## Lessons Learned

1. **Question Assumptions**: Always validate the necessity of complex features
2. **Systematic Cleanup**: When removing features, ensure all layers are updated consistently
3. **Test Coverage**: Comprehensive tests help catch regressions during refactoring
4. **Documentation**: Clear commit messages and documentation aid future development
5. **Developer Experience**: Small improvements to development workflow (like optimized hooks) have significant impact
6. **Proper Test Skipping**: Use `test.skip()` correctly without unreachable code patterns

## Related Files

### Data Source Configuration Changes
- `/plugins/resources/tenant-data-source-config/db/schema.prisma`
- `/plugins/resources/tenant-data-source-config/api/index.ts`
- `/plugins/resources/tenant-data-source-config/api/index.test.ts`
- `/.claude/hooks/pre-bash.sh`
- `/.claude/hooks/pre-commit.sh`

### E2E Test Changes
- `/e2e-tests/tests/onboarding-flow.spec.ts` - Main test file
- Project linting configuration via Biome
- Playwright configuration in the e2e-tests workspace

## Commit History

The changes were implemented through a series of focused commits:

1. `feat: remove instanceId from TenantDataSourceConfig model`
2. `fix: update pre-bash hook to handle undefined command variable`
3. `feat: optimize pre-commit hook with Turbo filtering`
4. `fix: remove tests for deleted PUT/DELETE config endpoints`
5. `docs: add guidance for running tests on individual packages`
6. `fix: resolve unreachable code in E2E test suite`

This systematic approach ensures clear history and easier reversal if needed.