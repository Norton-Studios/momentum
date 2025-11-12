# Product Specification

## Overview

Momentum provides comprehensive developer productivity metrics organized into two hierarchical views: Organization and Individual. The platform collects data from multiple sources, processes it through a sophisticated orchestration system, and presents actionable insights through interactive dashboards.

## Metrics Hierarchy

### Organization View
Aggregate metrics providing high-level insights across all teams and repositories.

### Individual View
Personal productivity metrics for each contributor.

## Organization Metrics

### Delivery

#### Deployment Velocity
Measure the speed and frequency of software delivery.

**Metrics**:
- Deployment frequency (deployments per day/week/month)
- Successful deployments trend
- Release cycle time (first commit to production)
- Lead time for changes (commit to merge to deploy)
- Time from merge to production

**Data Sources**: CI/CD platforms, deployment trackers, version control systems

**Visualization**:
- Line chart showing deployment frequency over time
- Bar chart of deployments per time period
- Cycle time distribution histogram
- Lead time breakdown by stage

#### Commit & PR Activity
Track development throughput and patterns.

**Metrics**:
- Total commits per day/week
- Commit rate trends
- Pull requests created/merged
- PR merge rate
- Average time to merge
- PR size distribution

**Data Sources**: Version control systems (GitHub, GitLab, Bitbucket)

**Visualization**:
- Line chart of commit/PR trends
- Bar chart of daily/weekly activity
- Histogram of PR sizes
- Time to merge distribution

#### Cycle Time Breakdown
Understand where time is spent in the delivery process.

**Metrics**:
- Coding time (first commit to PR creation)
- Review time (PR creation to approval)
- Deployment time (approval to production)
- Total cycle time with breakdown
- Bottleneck identification

**Data Sources**: Version control systems, CI/CD platforms

**Visualization**:
- Stacked bar chart showing time breakdown
- Trend line of cycle time over time
- Bottleneck heatmap

#### Work In Progress
Monitor flow and identify constraints.

**Metrics**:
- Open PRs count with age distribution
- Active branches
- PRs waiting for review
- PRs in review
- Average WIP per developer

**Data Sources**: Version control systems

**Visualization**:
- Bar chart of WIP items by status
- Age distribution histogram
- Trend of WIP over time

---

### Operational

#### Pipeline Success Rate
Monitor build and deployment reliability.

**Metrics**:
- Overall pipeline success rate (last 7/30/90 days)
- Rolling 30-day average success rate
- Success/failure trends
- Success rate by time of day
- Success rate by day of week
- Pipeline stability score

**Data Sources**: CI/CD platforms (Jenkins, GitHub Actions, GitLab CI)

**Visualization**:
- Line chart with rolling average and trend
- Heatmap of failures by time of day
- Bar chart of success rate by day of week
- Sparkline showing recent trend

#### Pipeline Duration
Track build and deployment speed.

**Metrics**:
- Average pipeline duration
- Duration trends over time
- Duration by stage/step
- Slowest pipelines identification
- Duration percentiles (p50, p95, p99)

**Data Sources**: CI/CD platforms

**Visualization**:
- Line chart of average duration over time
- Stacked bar chart showing duration by stage
- Box plot showing duration distribution
- Table of slowest pipelines

#### Pipeline Failure Analysis
Understand and reduce build failures.

**Metrics**:
- Failure rate by stage/step
- Top failure reasons with counts
- Most frequently failing jobs
- Mean time to recovery (MTTR)
- Failure patterns (time-based, commit-based)

**Data Sources**: CI/CD platforms

**Visualization**:
- Pie chart of failures by stage
- Bar chart of top failure reasons
- Trend line of failure rate
- Table of problematic jobs

#### Infrastructure Costs
Monitor cloud hosting and infrastructure spend.

**Metrics**:
- Total monthly infrastructure costs
- Cost trends over time
- Cost breakdown by service/resource
- Cost per deployment
- Budget vs actual spend

**Data Sources**: Cloud platforms (AWS, Azure, GCP)

**Visualization**:
- Line chart of monthly costs
- Pie chart of cost breakdown
- Bar chart comparing budget vs actual
- Cost per deployment trend

---

### Quality

#### Code Coverage
Track test coverage across the codebase.

**Metrics**:
- Overall code coverage percentage
- Coverage trends over time
- Coverage by module/package
- New code coverage vs overall
- Uncovered critical paths
- Coverage gaps identification

**Data Sources**: SonarQube, CodeClimate, coverage tools

**Visualization**:
- Line chart of coverage percentage over time
- Bar chart of coverage by module
- Heatmap showing coverage distribution
- Comparison of new vs overall coverage

#### Code Quality Metrics
Monitor code maintainability and complexity.

**Metrics**:
- Code smells count and trends
- Technical debt ratio
- Cyclomatic complexity
- Cognitive complexity
- Maintainability rating
- Code duplication percentage

**Data Sources**: SonarQube, CodeClimate

**Visualization**:
- Line chart of technical debt over time
- Bar chart of code smells by severity
- Complexity distribution histogram
- Maintainability rating trend

#### Security Vulnerabilities
Track and manage security issues.

**Metrics**:
- Security vulnerabilities count
- Severity distribution (Critical, High, Medium, Low)
- Vulnerabilities by type
- Average time to resolution
- Vulnerability aging
- Security hotspots

**Data Sources**: SonarQube, security scanners, dependency scanners

**Visualization**:
- Stacked area chart for severity trends
- Donut chart for severity distribution
- Timeline of resolution progress
- Aging histogram

#### Code Review Quality
Measure the thoroughness of code reviews.

**Metrics**:
- Average comments per PR
- Review depth score
- Percentage of PRs with no comments
- Comment resolution time
- Approval patterns

**Data Sources**: Version control systems

**Visualization**:
- Line chart of comments per PR over time
- Bar chart of review depth distribution
- Trend of PRs without review comments

---

## Individual Metrics

### Contribution Metrics

#### Commit Activity
Track individual commit patterns and consistency.

**Metrics**:
- Total commits with trend
- Commit frequency (commits per day/week)
- Commit streak tracking (consecutive days)
- Commit size distribution (lines changed)

**Data Sources**: Version control systems

**Visualization**:
- Line chart of commit frequency
- Contribution calendar (GitHub-style)
- Distribution chart of commit sizes

#### Code Contribution
Measure the volume and nature of code changes.

**Metrics**:
- Lines added/removed with balance
- Net code contribution
- Language distribution (percentage by language)
- Repository contribution spread

**Data Sources**: Version control systems

**Visualization**:
- Stacked area chart of additions vs deletions
- Pie chart of language breakdown
- Bar chart of repository contributions

#### Merge Request Activity
Track pull request creation and success.

**Metrics**:
- MRs created count and trend
- MR success rate (merged vs closed without merge)
- Average MR size (lines changed, files modified)
- MR iteration count (rounds of review)

**Data Sources**: Version control systems

**Visualization**:
- Line chart of MRs created over time
- Success rate percentage with trend
- Histogram of MR sizes

---

### Collaboration Metrics

#### Review Performance
Measure effectiveness as a code reviewer.

**Metrics**:
- Average time to first review (as reviewer)
- Number of review comments made
- Review thoroughness score
- Review response time

**Data Sources**: Version control systems

**Visualization**:
- Line chart of review response times
- Bar chart of review volume
- Trend of thoroughness score

#### Review Reception
Track how quickly an individual responds to review feedback.

**Metrics**:
- Time to address review comments
- Comment resolution rate
- MR iteration efficiency
- Collaboration score

**Data Sources**: Version control systems

**Visualization**:
- Line chart of response times
- Resolution rate percentage
- Iteration efficiency trend

---

### Productivity Patterns

#### Activity Patterns
Understand individual work habits and rhythms.

**Metrics**:
- Personal commit time heatmap (productivity hours)
- Day of week activity distribution
- Focus time analysis (continuous coding periods)
- Context switching frequency

**Data Sources**: Version control systems, commit metadata

**Visualization**:
- Personal 24x7 heatmap
- Focus time duration histogram
- Daily rhythm line chart

---

## Global Dashboard Features

### Date Range Selector
All metrics support flexible date range selection:
- **Preset Ranges**: 7 days, 30 days, 60 days, 90 days
- **Custom Range**: User-defined start and end dates
- **Comparison Mode**: Compare to previous equivalent period
- **All metrics respect the selected date range**

### Interactive Charts
Enhanced user interaction with visualizations:
- Toggle individual data series on/off
- Hover tooltips with detailed values
- Click to drill down to detailed views
- Zoom and pan for time-series data
- Export functionality (PNG, CSV, JSON)

### Filtering and Grouping
- Filter by team, repository, or contributor
- Group metrics by time period (daily, weekly, monthly)
- Apply multiple filters simultaneously
- Save and share filter configurations

---

## Data Sources

### Version Control Systems

#### GitHub
**Resources Populated**:
- Repositories (name, description, stars, forks, language)
- Commits (SHA, message, author, date, lines changed)
- Pull Requests (title, state, author, reviewers, comments)
- Contributors (name, email, profile)
- Pull Request Reviews (comments, state, timestamps)

**Configuration Required**:
- Personal Access Token (PAT)
- Organization name(s)
- Repository visibility filter

**Collection Scripts**:
- `repository.ts`: Fetch all repositories
- `commit.ts`: Fetch commits with file changes
- `pull-request.ts`: Fetch PRs and reviews
- `contributor.ts`: Fetch user profiles

#### GitLab
**Resources Populated**:
- Projects (repositories)
- Commits
- Merge Requests
- Contributors
- MR Notes (reviews and comments)

**Configuration Required**:
- Private token
- GitLab instance URL
- Group/project IDs

**Collection Scripts**:
- `project.ts`: Fetch projects
- `commit.ts`: Fetch commits
- `merge-request.ts`: Fetch MRs
- `contributor.ts`: Fetch users

#### Bitbucket
**Resources Populated**:
- Repositories
- Commits
- Pull Requests
- Contributors

**Configuration Required**:
- App password
- Workspace slug
- Repository filters

**Collection Scripts**:
- `repository.ts`: Fetch repositories
- `commit.ts`: Fetch commits
- `pull-request.ts`: Fetch PRs

---

### CI/CD Platforms

#### Jenkins
**Resources Populated**:
- Pipelines (job definitions)
- Builds (job executions)
- Build Steps (stage results)

**Configuration Required**:
- Jenkins URL
- API token
- Job name patterns

**Collection Scripts**:
- `job.ts`: Fetch job definitions
- `build.ts`: Fetch build results
- `build-step.ts`: Fetch stage details

#### GitHub Actions
**Resources Populated**:
- Workflows (pipeline definitions)
- Workflow Runs (executions)
- Jobs (build steps)

**Configuration Required**:
- Automatically configured with GitHub VCS integration

**Collection Scripts**:
- `workflow.ts`: Fetch workflow definitions
- `workflow-run.ts`: Fetch run results

#### GitLab CI
**Resources Populated**:
- Pipelines
- Jobs

**Configuration Required**:
- Automatically configured with GitLab VCS integration

**Collection Scripts**:
- `pipeline.ts`: Fetch pipeline results

#### CircleCI
**Resources Populated**:
- Pipelines
- Workflows
- Jobs

**Configuration Required**:
- API token
- Project slugs

**Collection Scripts**:
- `pipeline.ts`: Fetch pipeline data

---

### Project Management Tools

#### JIRA
**Resources Populated**:
- Projects
- Issues (tickets)
- Sprints
- Boards
- Status transitions

**Configuration Required**:
- JIRA URL
- API token or OAuth
- Project keys

**Collection Scripts**:
- `project.ts`: Fetch projects
- `issue.ts`: Fetch issues and history
- `sprint.ts`: Fetch sprint data
- `board.ts`: Fetch board configurations

#### Trello
**Resources Populated**:
- Boards
- Lists (statuses)
- Cards (issues)
- Members

**Configuration Required**:
- API key
- Token
- Board IDs

**Collection Scripts**:
- `board.ts`: Fetch boards
- `card.ts`: Fetch cards
- `member.ts`: Fetch members

#### Asana
**Resources Populated**:
- Projects
- Tasks
- Users

**Configuration Required**:
- Personal access token
- Workspace ID

**Collection Scripts**:
- `project.ts`: Fetch projects
- `task.ts`: Fetch tasks

---

### Code Quality Tools

#### SonarQube
**Resources Populated**:
- Quality scans
- Code smells
- Technical debt
- Security vulnerabilities
- Test coverage
- Complexity metrics

**Configuration Required**:
- SonarQube URL
- Authentication token
- Project keys

**Collection Scripts**:
- `quality-scan.ts`: Fetch analysis results
- `security.ts`: Fetch vulnerabilities
- `coverage.ts`: Fetch coverage metrics

#### CodeClimate
**Resources Populated**:
- Code quality metrics
- Maintainability ratings
- Test coverage

**Configuration Required**:
- API token
- Repository IDs

**Collection Scripts**:
- `quality.ts`: Fetch quality metrics

---

### Cloud & Infrastructure

#### AWS
**Resources Populated**:
- Deployment events
- Resource usage
- Cost metrics

**Configuration Required**:
- Access key ID
- Secret access key
- Region

**Collection Scripts**:
- `deployment.ts`: Fetch deployment data

#### Azure
**Resources Populated**:
- Deployment events
- Resource metrics

**Configuration Required**:
- Subscription ID
- Service principal credentials

**Collection Scripts**:
- `deployment.ts`: Fetch deployment data

#### Google Cloud Platform
**Resources Populated**:
- Deployment events
- Resource metrics

**Configuration Required**:
- Service account JSON
- Project ID

**Collection Scripts**:
- `deployment.ts`: Fetch deployment data

---


## Data Collection System

### Architecture Overview

The data collection system orchestrates imports from configured data sources, manages dependencies, and ensures reliable incremental collection.

### Core Components

#### 1. Cron Orchestrator
Main entry point coordinating data collection.

**Responsibilities**:
- Query data source configurations
- Build execution graphs using dependency resolution
- Manage concurrent execution with database locking
- Track execution history


#### 2. Configuration Management
Stores data source configurations as key-value pairs.

**Configuration Storage**:
- Data source identifier (e.g., "github", "jira")
- Key-value pairs for environment variables
- API keys, endpoints, credentials

#### 4. Execution Tracking
Tracks execution history for each data source script.

**DataSourceRun Model**:
- Data source identifier
- Script name
- Start and completion timestamps
- Status (RUNNING, COMPLETED, FAILED)
- Error message (if failed)
- Last fetched data date (for incremental collection)

---

### Execution Flow

#### 1. Configuration Discovery
```typescript
// Query all configured data sources
const configs = await db.dataSourceConfig.findMany();

// Group by data source
const dataSourceConfigs = groupBy(configs, 'dataSource');
```

#### 2. Environment Building
```typescript
// Build environment object per data source
const environments = dataSourceConfigs.map(([dataSource, configs]) => {
  const env = configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, string>);

  return { dataSource, env };
});
```

#### 3. Module Discovery

Use the config values to decide what scripts to load.


#### 4. Dependency Graph Construction

each data source import script will list what resources it provides and what resources it depends on. Use this to build a dependency graph.

```typescript
// Build dependency graph
const scripts = getConfiguredScripts();
const graph = buildDependencyGraph(scripts);

// Example graph structure:
// github-contributor -> github-repository -> github-commit
//                   \-> github-pull-request
```

#### 5. Concurrent Execution
```typescript
// Execute with p-graph managing dependencies
await pGraph(graph).run(async (script) => {
  await executeScript(script, env);
});
```

---

### Concurrency Control

#### Database Locking Strategy
Prevents multiple executions of the same script.

**SQL Query**:
```sql
-- Acquire lock for specific dataSource + script
SELECT * FROM data_source_run
WHERE data_source = ? AND script = ?
FOR UPDATE SKIP LOCKED;
```

**Lock Granularity**:
- **Data Source Level**: Scripts within same data source can run in parallel
- **Script Level**: Exact same script cannot run concurrently

#### Execution Isolation
```typescript
async function executeScript(
  script: DataSourceScript,
  env: Record<string, string>
) {
  // Acquire lock
  const lockResult = await db.$queryRaw`
    SELECT id FROM data_source_run
    WHERE data_source = ${script.dataSource}
    AND script = ${script.scriptName}
    FOR UPDATE SKIP LOCKED
  `;

  if (lockResult.length === 0) {
    // Another process is already running this script
    return;
  }

  // Execute with lock held
  await executeWithTracking(script, env);
}
```

---

### Incremental Data Collection

#### Date Range Calculation
Each data source tracks the last successful collection date.

**Algorithm**:
```typescript
async function calculateDateRange(
  dataSource: string,
  scriptName: string,
  importWindowDuration: number
): Promise<{ startDate: Date; endDate: Date }> {
  const lastRun = await db.dataSourceRun.findFirst({
    where: { dataSource, script: scriptName },
    orderBy: { startedAt: 'desc' }
  });

  const endDate = new Date();

  // Use last fetched date, or default to 90 days ago
  const startDate = lastRun?.lastFetchedDataDate
    ? new Date(lastRun.lastFetchedDataDate.getTime())
    : new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));

  // Respect import window duration
  const maxStartDate = new Date(endDate.getTime() - importWindowDuration);
  if (startDate < maxStartDate) {
    startDate.setTime(maxStartDate.getTime());
  }

  return { startDate, endDate };
}
```

**Benefits**:
- Reduces API calls to external systems
- Faster collection for frequently run jobs
- Respects rate limits
- Allows catch-up for missed collections

#### Progress Tracking
```typescript
async function executeWithTracking(
  script: DataSourceScript,
  env: Record<string, string>
) {
  const { startDate, endDate } = await calculateDateRange(
    script.dataSource,
    script.scriptName,
    script.importWindowDuration
  );

  // Create/update run record
  const runRecord = await db.dataSourceRun.upsert({
    where: {
      dataSource_script: {
        dataSource: script.dataSource,
        script: script.scriptName
      }
    },
    update: {
      status: 'RUNNING',
      startedAt: new Date(),
      error: null
    },
    create: {
      dataSource: script.dataSource,
      script: script.scriptName,
      status: 'RUNNING',
      startedAt: new Date()
    }
  });

  try {
    // Execute the script
    await script.run(env, db, startDate, endDate);

    // Mark as completed
    await db.dataSourceRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        lastFetchedDataDate: endDate
      }
    });
  } catch (error) {
    // Mark as failed
    await db.dataSourceRun.update({
      where: { id: runRecord.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error.message
      }
    });
    throw error;
  }
}
```

---

### Error Handling and Recovery

#### Failure Isolation
- Data source failures don't affect other data sources
- Script failures don't affect other scripts
- Failed runs can be retried on subsequent cron executions

#### Recovery Strategies
1. **Automatic Retry**: Failed runs automatically retry on next cron execution
2. **Incremental Recovery**: Failed runs don't lose progress - next execution picks up from last successful point
3. **Manual Intervention**: Administrators can reset `lastFetchedDataDate` to force full re-import

---

## Data Source Configuration

### Configuration Interface

#### Adding a Data Source
Users configure data sources through the dashboard settings:

**Configuration Form**:
1. Select data source type (GitHub, JIRA, etc.)
2. Provide required credentials
3. Configure scope (organizations, projects, etc.)
4. Test connection
5. Save configuration

#### Configuration Storage
Stored as data source, config key, and triples in the database:


| Data source   | Key             | Value                           |
| ------------- | --------------- | ------------------------------- |
| github        | GITHUB_TOKEN    | ghp_xxxxxxxx                    |

**Example in json**:
```json
{
  "dataSource": "github",
  "configs": [
    { "key": "GITHUB_TOKEN", "value": "ghp_..." },
    { "key": "GITHUB_ORG", "value": "my-organization" },
    { "key": "GITHUB_VISIBILITY", "value": "all" }
  ]
}
```
