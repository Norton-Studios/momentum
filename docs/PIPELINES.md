# CI/CD Pipelines

## Overview

Momentum uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, runs comprehensive tests, and performs static analysis before changes are merged to the main branch.

## Pipeline Architecture

### Workflow Structure

```
GitHub Actions Workflow
├── Lint Job
├── Test Job
│   └── Coverage Artifact Upload
├── E2E Job
└── SonarQube Job (Depends on Test)
    └── Coverage Artifact Download
```

### Trigger Events

**Pull Requests**:
- Branches: `master`, `main`
- Runs on every push to PR

**Push Events**:
- Branches: `master`, `main`
- Runs on direct commits to main branches

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Benefits**:
- Prevents multiple runs for the same ref
- Cancels in-progress runs when new commits are pushed
- Saves CI/CD minutes
- Provides faster feedback

---

## Job Specifications

### 1. Lint Job

**Purpose**: Enforce code style and catch common issues

**Runs on**: `ubuntu-latest`

**Steps**:

1. **Checkout Repository**
   ```yaml
   - uses: actions/checkout@v5
     with:
       fetch-depth: 0  # Fetch all history for changed file detection
   ```

2. **Enable Corepack**
   ```yaml
   - run: corepack enable
   ```
   Required for Yarn 4 support

3. **Setup Node.js**
   ```yaml
   - uses: actions/setup-node@v5
     with:
       node-version-file: .nvmrc
   ```
   Uses version from `.nvmrc` file for consistency

4. **Cache Yarn Dependencies**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: |
         .yarn/cache
         .yarn/install-state.gz
         node_modules
       key: ${{ runner.os }}-yarn-${{ hashFiles('yarn.lock') }}
       restore-keys: |
         ${{ runner.os }}-yarn-
   ```
   **Cache Benefits**:
   - Faster installation (30-60 seconds faster)
   - Reduced network traffic
   - Consistent across jobs

5. **Install Dependencies**
   ```yaml
   - run: yarn install --immutable
   ```
   The `--immutable` flag ensures lock file is not modified

6. **Setup Turbo Cache**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: .turbo
       key: ${{ runner.os }}-turbo-lint-${{ github.sha }}
       restore-keys: |
         ${{ runner.os }}-turbo-lint-
   ```
   Caches Turbo's internal cache for faster runs

7. **Run Lint for Changed Packages**
   ```yaml
   - run: |
       if [ "${{ github.event_name }}" = "pull_request" ]; then
         npx turbo lint --filter="...[origin/${{ github.base_ref }}]"
       else
         npx turbo lint --filter="...[HEAD^1]"
       fi
   ```

   **Optimization**: Only lints packages that have changed
   - **Pull Requests**: Compares against base branch
   - **Push**: Compares against previous commit

**Tool Used**: Biome (fast, all-in-one linter and formatter)

**Typical Duration**: 30-60 seconds

---

### 2. Test Job

**Purpose**: Run unit and integration tests with coverage

**Runs on**: `ubuntu-latest`

**Steps**:

1. **Checkout, Enable Corepack, Setup Node** (same as Lint job)

2. **Cache Yarn Dependencies** (same as Lint job)

3. **Install Dependencies** (same as Lint job)

4. **Generate Prisma Client**
   ```yaml
   - run: yarn workspace @mmtm/database run generate
   ```
   Required for tests that interact with database models

5. **Setup Turbo Cache**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: .turbo
       key: ${{ runner.os }}-turbo-test-${{ github.sha }}
       restore-keys: |
         ${{ runner.os }}-turbo-test-
   ```

6. **Run Unit Tests for Changed Packages**
   ```yaml
   - run: |
       if [ "${{ github.event_name }}" = "pull_request" ]; then
         npx turbo test --filter="...[origin/${{ github.base_ref }}]" -- --coverage
       else
         npx turbo test -- --coverage
       fi
   ```

   **Strategy Differences**:
   - **Pull Requests**: Test only changed packages
   - **Push to Main**: Test entire suite for complete coverage

7. **Merge Coverage Reports**
   ```yaml
   - run: npx lcov-result-merger **/coverage/lcov.info lcov.info --prepend-source-files
   ```
   Combines coverage from all packages into single file

8. **Upload Coverage Artifacts**
   ```yaml
   - uses: actions/upload-artifact@v5
     if: always()
     with:
       name: coverage-reports-${{ github.run_id }}
       path: 'lcov.info'
       retention-days: 1
       if-no-files-found: ignore
   ```

   **Key Details**:
   - `if: always()`: Upload even if tests fail
   - Unique name with run ID prevents conflicts
   - 1-day retention (temporary, used by SonarQube job)
   - Graceful handling if no coverage generated

**Test Framework**: Vitest

**Coverage Format**: LCOV (compatible with SonarQube)

**Typical Duration**: 2-4 minutes

---

### 3. E2E Job

**Purpose**: Run end-to-end tests with Playwright

**Runs on**: `ubuntu-latest`

**Steps**:

1. **Checkout, Enable Corepack, Setup Node** (same as Lint job)

2. **Cache Yarn Dependencies** (same as Lint job)

3. **Install Dependencies** (same as Lint job)

4. **Generate Prisma Client** (same as Test job)

5. **Restore Playwright Browsers Cache**
   ```yaml
   - uses: actions/cache/restore@v4
     id: playwright-cache
     with:
       path: ~/.cache/ms-playwright
       key: ${{ runner.os }}-playwright-${{ hashFiles('e2e-tests/package.json') }}
       restore-keys: |
         ${{ runner.os }}-playwright-
   ```

6. **Install Playwright Browsers**
   ```yaml
   - if: steps.playwright-cache.outputs.cache-hit != 'true'
     run: yarn workspace e2e-tests run playwright install chromium --with-deps
   ```
   Only installs if cache miss

7. **Install Playwright System Dependencies** (if cached)
   ```yaml
   - if: steps.playwright-cache.outputs.cache-hit == 'true'
     run: yarn workspace e2e-tests run playwright install-deps chromium
   ```
   System deps may be outdated even with browser cache

8. **Save Playwright Browsers Cache**
   ```yaml
   - if: steps.playwright-cache.outputs.cache-hit != 'true'
     uses: actions/cache/save@v4
     with:
       path: ~/.cache/ms-playwright
       key: ${{ runner.os }}-playwright-${{ hashFiles('e2e-tests/package.json') }}
   ```

9. **Run E2E Tests**
   ```yaml
   - run: yarn workspace e2e-tests run test:e2e
   ```

10. **Upload Playwright Report** (on failure)
    ```yaml
    - uses: actions/upload-artifact@v5
      if: failure()
      with:
        name: playwright-report
        path: e2e-tests/test-results/
        retention-days: 30
    ```

**Browser**: Chromium (fastest, sufficient for testing)

**Test Infrastructure**:
- Testcontainers for PostgreSQL
- Programmatic migrations
- Service orchestration

**Typical Duration**: 3-5 minutes

---

### 4. SonarQube Job

**Purpose**: Static code analysis and quality gate

**Runs on**: `ubuntu-latest`

**Dependencies**: Requires Test job to complete (needs coverage data)

```yaml
needs: test
```

**Steps**:

1. **Checkout Repository**
   ```yaml
   - uses: actions/checkout@v5
     with:
       fetch-depth: 0  # Required for SonarQube blame information
   ```

2. **Download Coverage Artifacts**
   ```yaml
   - uses: actions/download-artifact@v6
     continue-on-error: true
     with:
       name: coverage-reports-${{ github.run_id }}
   ```
   `continue-on-error`: Proceeds even if no coverage available

3. **SonarQube Scan**
   ```yaml
   - uses: SonarSource/sonarqube-scan-action@master
     env:
       SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
   ```

**Configuration File**: `sonar-project.properties`

**Metrics Analyzed**:
- Code coverage
- Code smells
- Bugs and vulnerabilities
- Technical debt
- Duplication
- Maintainability rating

**Typical Duration**: 1-2 minutes

---

## Caching Strategy

### Multi-Level Caching

#### 1. Yarn Dependencies Cache
**Path**: `.yarn/cache`, `.yarn/install-state.gz`, `node_modules`

**Key**: `${{ runner.os }}-yarn-${{ hashFiles('yarn.lock') }}`

**Benefits**:
- Fastest installation (cache hit: ~10s vs miss: ~60s)
- Shared across all jobs
- Invalidated only when dependencies change

#### 2. Turbo Build Cache
**Path**: `.turbo`

**Key per job**:
- Lint: `${{ runner.os }}-turbo-lint-${{ github.sha }}`
- Test: `${{ runner.os }}-turbo-test-${{ github.sha }}`

**Benefits**:
- Caches build outputs and test results
- Enables incremental builds
- Speeds up unchanged packages

#### 3. Playwright Browsers Cache
**Path**: `~/.cache/ms-playwright`

**Key**: `${{ runner.os }}-playwright-${{ hashFiles('e2e-tests/package.json') }}`

**Benefits**:
- Avoids downloading browsers (~400MB) on every run
- Significantly faster E2E job startup
- Invalidated when Playwright version changes

### Cache Hit Rates
Expected cache performance:
- **Yarn**: 95%+ hit rate (dependencies rarely change)
- **Turbo**: Varies by changes (30-70%)
- **Playwright**: 90%+ hit rate (browser version stable)

---

## Optimization Techniques

### 1. Smart Change Detection

**Changed Packages Only**:
```bash
# For pull requests
turbo lint --filter="...[origin/${{ github.base_ref }}]"

# For pushes to main
turbo lint --filter="...[HEAD^1]"
```

**Impact**:
- Typical PR: Test 2-5 packages instead of 20+
- 60-80% faster execution
- Reduced CI/CD costs

### 2. Parallel Job Execution

Three jobs run in parallel:
- Lint
- Test
- E2E

**Total Duration**: Max of the three (not sum)
- Without parallelization: ~10 minutes
- With parallelization: ~5 minutes

### 3. Artifact Sharing

Coverage data flows between jobs:
```
Test Job (generates) → Upload Artifact → SonarQube Job (downloads)
```

**Benefits**:
- No need to rerun tests in SonarQube job
- Faster overall pipeline
- Single source of truth for coverage

### 4. Conditional Execution

**Coverage Upload**:
```yaml
if: always()  # Even if tests fail
```

**Playwright Report Upload**:
```yaml
if: failure()  # Only when E2E tests fail
```

**Benefits**:
- Don't waste time on unnecessary uploads
- Reduced storage costs
- Faster jobs

---

## Required Secrets

### GitHub Repository Secrets

#### SONAR_TOKEN
- **Description**: Authentication token for SonarQube
- **How to generate**: SonarQube > My Account > Security > Generate Token
- **Permissions**: Execute Analysis
- **Typical format**: `sqp_...`


---

## Workflow Files

### Location
`.github/workflows/test.yml`

### Full Workflow Configuration

```yaml
name: Test

on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint Changed Packages
    runs-on: ubuntu-latest
    steps:
      # See Lint Job section above

  test:
    name: Test Changed Packages
    runs-on: ubuntu-latest
    steps:
      # See Test Job section above

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      # See E2E Job section above

  sonarqube:
    name: SonarQube Analysis
    runs-on: ubuntu-latest
    needs: test
    steps:
      # See SonarQube Job section above
```

---

## Performance Benchmarks

### Typical Execution Times

**With Cache Hits**:
- Lint Job: 40-60 seconds
- Test Job: 2-3 minutes
- E2E Job: 3-4 minutes
- SonarQube Job: 1-2 minutes
- **Total Duration**: ~4 minutes (parallel execution)

**With Cache Misses**:
- Lint Job: 90-120 seconds
- Test Job: 4-5 minutes
- E2E Job: 5-7 minutes
- SonarQube Job: 1-2 minutes
- **Total Duration**: ~7 minutes (parallel execution)

**Full Test Suite** (push to main):
- Test Job: 4-6 minutes (all packages)
- Other jobs: Same as above
- **Total Duration**: ~6 minutes

### CI/CD Cost Optimization

**Monthly Minutes Usage** (estimated):
- 50 PRs/month × 4 minutes = 200 minutes
- 50 commits to main × 6 minutes = 300 minutes
- **Total**: ~500 minutes/month

**GitHub Actions Free Tier**: 2,000 minutes/month (sufficient)

---

## Troubleshooting

### Common Issues

#### 1. Cache Restoration Failures

**Symptom**: Jobs take longer, downloads all dependencies

**Solution**:
- Check if `yarn.lock` has changed (invalidates cache)
- Verify cache key is correct
- Clear GitHub Actions cache manually if corrupted

#### 2. Test Failures in CI but Pass Locally

**Possible Causes**:
- Missing environment variables
- Database state differences
- Timing issues in tests

**Solution**:
- Use Testcontainers for consistent DB state
- Mock time-dependent functions
- Add retries for flaky tests

#### 3. E2E Tests Timeout

**Possible Causes**:
- Database container startup slow
- Service initialization delays
- Network issues

**Solution**:
- Increase timeout values in Playwright config
- Add explicit waits for service readiness
- Use health check endpoints

#### 4. SonarQube Quality Gate Fails

**Possible Causes**:
- Coverage below threshold
- New code smells or bugs introduced
- Security vulnerabilities detected

**Solution**:
- Review SonarQube report
- Fix identified issues
- Adjust quality gate if too strict (with team agreement)

---

## Future Enhancements

### Planned Improvements

1. **Deploy Job**
   - Automatic deployment to staging on main branch push
   - Manual approval for production deployments
   - Docker image building and pushing

2. **Performance Testing**
   - Lighthouse CI for frontend performance
   - API load testing with k6
   - Performance regression detection

3. **Security Scanning**
   - Dependabot for dependency updates
   - Snyk or Trivy for vulnerability scanning
   - SAST/DAST integration

4. **Notification Integration**
   - Slack notifications for failures
   - GitHub status checks
   - Email digests for quality trends

5. **Deployment Strategies**
   - Blue-green deployments
   - Canary releases
   - Rollback automation

---

## Best Practices

### For Developers

1. **Run Tests Locally Before Pushing**
   ```bash
   yarn test
   yarn lint
   ```

2. **Keep PRs Small**
   - Faster CI execution
   - Easier code review
   - Quick feedback

3. **Write Fast Tests**
   - Mock external dependencies
   - Use in-memory databases where possible
   - Parallelize test execution

4. **Fix Flaky Tests Immediately**
   - Flaky tests reduce confidence
   - Cause unnecessary reruns
   - Waste CI minutes

### For Maintainers

1. **Monitor CI/CD Performance**
   - Track average execution times
   - Identify slow jobs
   - Optimize bottlenecks

2. **Keep Dependencies Updated**
   - Newer versions often faster
   - Security patches important
   - Update GitHub Actions regularly

3. **Review Cache Strategy Periodically**
   - Remove unused caches
   - Adjust cache keys if needed
   - Monitor cache hit rates

4. **Set Appropriate Timeouts**
   - Prevent hanging jobs
   - Balance between reliability and speed
   - Adjust based on historical data

---

## Monitoring and Metrics

### Key Metrics to Track

1. **Pipeline Success Rate**
   - Target: > 95%
   - Track trends over time
   - Investigate drops immediately

2. **Average Execution Time**
   - Lint: < 1 minute
   - Test: < 4 minutes
   - E2E: < 5 minutes
   - Total: < 6 minutes

3. **Cache Hit Rate**
   - Target: > 85%
   - Lower rates indicate issues
   - Check cache key configuration

4. **Flaky Test Rate**
   - Target: < 1%
   - Measure as failed then passed on retry
   - Fix or quarantine flaky tests

### Dashboard Tools

**GitHub Insights**:
- Actions tab shows all workflow runs
- Filter by branch, status, actor
- Download logs for debugging

**Third-Party Tools**:
- GitHub Actions Dashboard (community projects)
- Custom scripts using GitHub API
- Grafana dashboards for metrics

---

## Conclusion

The CI/CD pipeline is designed for:
- **Speed**: Parallel execution, smart caching, change detection
- **Reliability**: Comprehensive testing, flaky test prevention
- **Quality**: SonarQube integration, coverage requirements
- **Cost Efficiency**: Optimized execution, minimal redundancy

Regular monitoring and optimization ensure the pipeline remains fast and effective as the project grows.
