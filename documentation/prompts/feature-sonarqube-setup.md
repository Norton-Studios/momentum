# SonarQube Setup and Vitest Configuration Improvements

## Context
This conversation focused on improving the SonarQube integration and fixing vitest configuration issues in the Momentum project. The work involved multiple aspects including vitest workspace configuration, GitHub Actions workflows, and coverage reporting.

## Key Changes Implemented

### 1. Vitest Configuration Migration
**From**: Vitest projects configuration in root config  
**To**: Individual vitest.config.ts files in each package

#### Root Configuration (vitest.config.ts)
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      reporter: ['lcov', 'text'],
      reportsDirectory: 'coverage',
    },
  },
})
```

#### Package-Level Configuration (extends root)
```typescript
import { defineConfig, mergeConfig } from 'vitest/config'
import rootConfig from '../../vitest.config' // or '../../../vitest.config' for plugins

export default mergeConfig(
  rootConfig,
  defineConfig({
    // custom config can go here if needed
  })
)
```

### 2. GitHub Actions Workflow Optimization
**Problem**: Tests were running twice (once in test job, once in sonarqube job)  
**Solution**: Implemented coverage artifact caching between jobs

#### Test Job Enhancement
```yaml
- name: Run unit tests for changed packages
  run: |
    if [ "${{ github.event_name }}" = "pull_request" ]; then
      npx turbo test --filter="...[origin/${{ github.base_ref }}]" -- --coverage
    else
      npx turbo test --filter="...[HEAD^1]" -- --coverage
    fi

- name: Upload coverage artifacts
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: coverage-reports-${{ github.run_id }}
    path: '**/coverage/'
    retention-days: 1
    if-no-files-found: ignore
```

#### SonarQube Job Enhancement
```yaml
sonarqube:
  name: SonarQube Analysis
  runs-on: ubuntu-latest
  needs: test
  
  steps:
    - name: Download coverage artifacts
      uses: actions/download-artifact@v4
      continue-on-error: true
      with:
        name: coverage-reports-${{ github.run_id }}
    
    - name: SonarQube Scan
      uses: SonarSource/sonarqube-scan-action@master
```

### 3. Coverage Generation Fix
**Issue**: Tests were running but no coverage files were generated  
**Root Cause**: Vitest doesn't generate coverage by default - needs `--coverage` flag  
**Solution**: Added `-- --coverage` flag to turbo test commands in GitHub Actions

### 4. Dependency Management
**Added**: `@vitest/coverage-v8` dependency for coverage report generation  
**Updated**: Package.json with new test scripts including `test:coverage`

### 5. Artifact Management
**Enhancement**: Used unique artifact names with `${{ github.run_id }}` to prevent conflicts  
**Benefit**: Ensures fresh coverage data for each workflow run

## Package Structure Changes

### 13 vitest.config.ts files created in:
- **Apps (4)**: api, crons, database, frontend
- **Resource Plugins (8)**: build, commit, contributor, merge-request, pipeline, repository, team, tenant
- **Data Source Plugins (1)**: github

### Turbo.json Update
```json
{
  "test": {
    "inputs": [
      "src/**/*.ts",
      "src/**/*.tsx", 
      "api/**/*.ts",
      "db/**/*.prisma",
      "**/*.test.ts",
      "**/*.spec.ts",
      "vitest.config.ts",  // Re-added for individual configs
      "tsconfig.json",
      "package.json"
    ]
  }
}
```

## Benefits Achieved

### 1. Performance Improvements
- **Eliminated duplicate test runs**: Tests now run only once, coverage is cached and reused
- **Reduced CI time**: SonarQube job no longer re-runs all tests
- **Efficient artifact management**: Unique naming prevents conflicts

### 2. Configuration Consistency
- **Centralized base config**: All packages inherit from root vitest.config.ts
- **Extensible setup**: Individual packages can override configurations as needed
- **Maintainable structure**: Changes to base config propagate to all packages

### 3. Reliability Improvements
- **Graceful failure handling**: `continue-on-error` and `if-no-files-found: ignore`
- **Artifact freshness**: Unique naming ensures no stale coverage data
- **Proper dependency management**: Job ordering with `needs: test`

## Technical Implementation Details

### Vitest Workspace vs Projects
- **Removed**: `vitest.workspace.ts` (deprecated approach)
- **Reason**: Projects configuration doesn't work well with Turbo
- **Solution**: Individual configs that extend root configuration

### Coverage Generation
- **Method**: Pass `--coverage` flag through turbo to vitest
- **Storage**: Coverage files generated in `coverage/` directories per package
- **Format**: LCOV format for SonarQube compatibility

### Artifact Flow
1. **Test job**: Runs tests with coverage, uploads artifacts
2. **SonarQube job**: Downloads artifacts, runs analysis
3. **Cleanup**: Artifacts expire after 1 day

## Lessons Learned

### 1. Vitest Configuration
- Projects configuration can conflict with monorepo tools like Turbo
- Individual configs with inheritance provide better flexibility
- Coverage generation requires explicit `--coverage` flag

### 2. GitHub Actions Optimization
- Artifact caching can significantly reduce CI time
- Unique naming prevents cross-workflow contamination
- Job dependencies ensure proper execution order

### 3. Monorepo Considerations
- Turbo's filtering works well for changed-package testing
- Coverage collection needs to account for dynamic package execution
- Consistent tooling across packages improves maintainability

## Future Considerations

### 1. Potential Enhancements
- **Parallel coverage collection**: For large monorepos
- **Incremental analysis**: Only analyze changed packages
- **Quality gate integration**: Fail builds on coverage thresholds

### 2. Monitoring
- **Coverage trends**: Track coverage changes over time
- **Performance metrics**: Monitor CI execution time
- **Artifact usage**: Ensure coverage data is being utilized

This comprehensive setup provides a robust foundation for code quality analysis while maintaining developer productivity and CI efficiency.