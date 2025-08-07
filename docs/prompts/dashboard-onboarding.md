# Dashboard Onboarding: E2E Test Linting Fix

## Summary

This document captures the resolution of linting errors discovered in the dashboard onboarding E2E test suite. The primary issue was unreachable code in the Playwright test file caused by improper use of test skipping mechanisms.

## Issue Description

During linting analysis of the codebase, unreachable code was detected in `/home/linus/Work/norton-studios/momentum/e2e-tests/tests/onboarding-flow.spec.ts`. The problem was in a test case that used both `test.skip()` to skip the test and contained an early return statement, making any code after the return unreachable.

## Root Cause

The issue was in the test structure where:
1. A test was marked as skipped using `test.skip()`
2. The test function still contained an early return statement
3. Any code after the return would be unreachable, triggering linting errors

## Solution

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

## Technical Details

- **File:** `e2e-tests/tests/onboarding-flow.spec.ts`
- **Testing Framework:** Playwright
- **Issue Type:** Unreachable code after early return
- **Linting Tool:** Biome (configured in the project)
- **Fix Type:** Structural refactoring of test case

## Test Suite Context

The onboarding flow E2E test suite includes:
- Sign-in page validation tests
- Sign-up page validation tests  
- Navigation flow testing between authentication pages
- Dashboard access control testing for unauthenticated users
- A placeholder for comprehensive onboarding flow testing (currently skipped)

## Best Practices Applied

1. **Proper Test Skipping:** Use `test.skip()` without early returns when the entire test should be bypassed
2. **Clear Documentation:** Include TODO comments explaining why tests are skipped
3. **Meaningful Logging:** Add console.log statements in skipped tests for debugging clarity
4. **Clean Code Structure:** Remove unreachable code patterns that trigger linting errors

## Related Files

- `/home/linus/Work/norton-studios/momentum/e2e-tests/tests/onboarding-flow.spec.ts` - Main test file
- Project linting configuration via Biome
- Playwright configuration in the e2e-tests workspace

## Future Considerations

The skipped test is intended to be re-enabled once the data source configuration functionality is fully implemented. The test structure is now ready for proper implementation when the underlying features are complete.