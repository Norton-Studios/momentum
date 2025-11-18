# Data Import System Specification

## Overview

Distributed job orchestration framework for importing data from external sources (GitHub, GitLab, Jenkins, etc.) with automatic dependency resolution and distributed locking.

### Execution Flow

1. **Acquire global lock** - System-wide PostgreSQL advisory lock ensures single orchestrator
2. **Load all scripts** - Scan `data-sources/` directory for all import scripts
3. **Filter by enabled data sources** - Keep only scripts for enabled DataSource records
4. **Build dependency graph** - Use `p-graph` to resolve execution order
5. **Execute with resource locks** - Each script acquires `dataSourceId:resource` advisory lock
6. **Track execution** - Record status, duration, records imported in DataSourceRun table
7. **Update sync timestamps** - Set DataSource.lastSyncAt after successful completion
8. **Release global lock** - Allow next orchestrator run

### Key Features

- **Two-level locking**: Global orchestrator lock + per-resource advisory locks
- **Parallel execution**: Different resources for same data source run concurrently
- **Incremental sync**: Uses lastFetchedDataAt to fetch only new data
- **Automatic dependencies**: `p-graph` handles topological sorting and parallelization
- **Crash-safe**: Advisory locks auto-release on connection close

## Dependencies

The following npm packages are required:
- `node-cron` - Job scheduling (~2KB)
- `p-graph` - Dependency graph execution with parallelization
- `@octokit/rest` - GitHub API SDK with pagination support
- `@octokit/types` - TypeScript types for GitHub API

Add TypeScript path alias `@crons/*` to `tsconfig.json` for cleaner imports.

## Architecture

### Components

```
crons/
├── index.ts                        # Entry point
├── scheduler.ts                    # node-cron scheduler
├── orchestrator/
│   ├── index.ts                    # Main orchestrator
│   └── script-loader.ts            # Load scripts by provider
├── execution/
│   ├── run-tracker.ts              # DataSourceRun management
│   └── date-calculator.ts          # Incremental sync dates
└── data-sources/
    └── github/
        ├── index.ts                # Export all scripts
        ├── repository.ts           # Import repositories
        ├── contributor.ts          # Import contributors
        ├── commit.ts               # Import commits
        └── pull-request.ts         # Import pull requests
```

### Domain Structure

#### Orchestrator Domain
Handles script discovery and execution coordination using `p-graph` for dependency resolution.

#### Execution Domain
Manages execution lifecycle: tracking, logging, and incremental sync calculations.

#### Data Sources Domain
Provider-specific implementations (GitHub, GitLab, etc.) with scripts that declare dependencies.

## Key Design Principles

### 1. Database-Driven Configuration

Configuration is stored in the database, not environment variables:

```typescript
// Load enabled data sources
const dataSources = await db.dataSource.findMany({
  where: { isEnabled: true },
  include: { configs: true }
});

// Build environment from DataSourceConfig
for (const dataSource of dataSources) {
  const env = dataSource.configs.reduce((acc, config) => {
    acc[config.key] = config.value;  // e.g., GITHUB_TOKEN, GITHUB_ORG
    return acc;
  }, {} as Record<string, string>);
}
```

### 2. Explicit Data Source Mapping with Generic Resources

Scripts explicitly declare which data source they belong to and use generic resource names:

```typescript
// ✅ Correct - explicit data source, generic dependencies
export const commitScript = {
  dataSourceName: 'GITHUB',     // Explicitly declares provider
  resource: 'commit',           // What this script provides
  dependsOn: ['repository'],    // Generic dependency
  importWindowDays: 90,
  async run(context) { ... }
};

// ❌ Wrong - don't scope dependencies to provider
{
  dataSourceName: 'GITHUB',
  resource: 'commit',
  dependsOn: ['github:repository']  // Don't do this - use 'repository'
}
```

This allows cross-provider dependency resolution:
- GitHub commits depend on "repository" (satisfied by GitHub's repository script)
- GitLab commits also depend on "repository" (satisfied by GitLab's repository script)
- Clear mapping between scripts and data sources via `dataSourceName`

### 3. Parallel Operations

Use `Promise.all` with `map` for efficient parallel operations:

```typescript
// ❌ Bad - sequential await in loop
for (const repo of repos) {
  await db.repository.upsert({ ... });
}

// ✅ Good - parallel with Promise.all
await Promise.all(
  repos.map(repo =>
    db.repository.upsert({ ... })
  )
);
```

For very large datasets, use batching:

```typescript
const BATCH_SIZE = 50;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map(item => db.table.upsert({ ... }))
  );
}
```

### 5. Simple Direct Logging

Log directly to the ImportLog table - no separate logging abstraction:

```typescript
await context.db.importLog.create({
  data: {
    dataSourceRunId: runId,
    level: 'INFO',
    message: 'Imported 50 repositories'
  }
});
```

## Distributed Locking Strategy

Uses **two-level advisory locking**: global orchestrator lock + per-resource locks.

### How It Works

1. **Acquire global orchestrator lock** (system-wide)
2. **Load all enabled data sources** from database
3. **Scan and filter import scripts** for enabled data sources
4. **Build p-graph** with all filtered scripts
5. **Execute scripts** - each acquires `dataSourceId:resource` lock before running
6. **Release resource locks** after each script completes
7. **Update DataSource.lastSyncAt** after all scripts complete for a data source
8. **Release global lock** when orchestrator finishes

### Why Two-Level Locking?

**Global Lock:**
- Ensures only ONE orchestrator runs at a time (system-wide)
- Prevents multiple p-graph executions from interfering
- Simple coordination mechanism

**Resource Locks:**
- Granular locking at `dataSourceId:resource` level (e.g., `ds-abc:commit`)
- Allows parallel execution of different resources for same data source
- Process A can work on `github:commit` while Process B works on `github:pull-request`
- Lightweight, no transactions needed
- Auto-released on connection close (crash-safe)

### Advisory Lock Implementation

```typescript
// Global orchestrator lock (system-wide)
const GLOBAL_ORCHESTRATOR_LOCK_ID = 999999;

async function acquireGlobalOrchestratorLock(db: PrismaClient): Promise<boolean> {
  const [result] = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(${GLOBAL_ORCHESTRATOR_LOCK_ID})
  `;
  return result.pg_try_advisory_lock;
}

async function releaseGlobalOrchestratorLock(db: PrismaClient): Promise<void> {
  await db.$queryRaw`SELECT pg_advisory_unlock(${GLOBAL_ORCHESTRATOR_LOCK_ID})`;
}

// Resource-level locks (per dataSourceId:resource)
async function acquireAdvisoryLock(
  db: PrismaClient,
  dataSourceId: string,
  resource: string
): Promise<boolean> {
  const lockKey = `${dataSourceId}:${resource}`;
  const [result] = await db.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey}))
  `;
  return result.pg_try_advisory_lock;
}

async function releaseAdvisoryLock(
  db: PrismaClient,
  dataSourceId: string,
  resource: string
): Promise<void> {
  const lockKey = `${dataSourceId}:${resource}`;
  await db.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
}
```

## Script Interface

### DataSourceScript

```typescript
export interface DataSourceScript {
  dataSourceName: string;           // 'GITHUB', 'GITLAB' - matches DataSourceProvider enum
  resource: string;                 // 'commit', 'repository', 'pull-request'
  dependsOn: string[];              // Generic: ['repository'], ['commit']
  importWindowDays: number;         // Default lookback window (e.g., 90)
  run: (context: ExecutionContext) => Promise<void>;
}
```

### ExecutionContext

```typescript
export interface ExecutionContext {
  dataSourceId: string;             // ID of the DataSource record
  dataSourceName: string;           // 'GITHUB', 'GITLAB' - provider name
  env: Record<string, string>;      // Environment variables from DataSourceConfig
  db: PrismaClient;                 // Database client
  startDate: Date;                  // Start of date range for incremental sync
  endDate: Date;                    // End of date range
  runId: string;                    // DataSourceRun ID for logging
}
```

## Dependency Resolution with p-graph

We use the `p-graph` npm package for dependency resolution and parallel execution.

### Using p-graph

```typescript
import PGraph from 'p-graph';

async function executeScriptsWithDependencies(
  tx: PrismaClient,
  dataSourceId: string,
  scripts: DataSourceScript[],
  env: Record<string, string>
) {
  const graph = new PGraph();

  // Add all scripts to the graph
  for (const script of scripts) {
    graph.add(
      async () => executeScript(tx, dataSourceId, script, env),
      script.dependsOn  // Dependencies (generic resource names)
    );
  }

  // Execute with dependency resolution
  await graph.run();
}
```

### How It Works

1. **Define tasks** - Each script is added to the graph with its dependencies
2. **Automatic resolution** - p-graph determines execution order via topological sort
3. **Parallel execution** - Scripts with no unmet dependencies run in parallel
4. **Sequential phases** - Each "level" completes before the next starts

Example for GitHub scripts:
```
Level 1: github:repository (depends on: [])
Level 2: github:contributor, github:commit, github:pull-request (depends on: ['repository'])
         ↳ All three run in parallel
```

## Script Loading

### Loading All Import Scripts

The orchestrator dynamically loads all available import scripts from the `data-sources/` directory:

```typescript
async function loadAllImportScripts(): Promise<DataSourceScript[]> {
  const allScripts: DataSourceScript[] = [];

  // List of all potential providers
  const providers = ['github', 'gitlab', 'jenkins', 'circleci', 'sonarqube'];

  for (const provider of providers) {
    try {
      // Dynamically import the provider module
      const module = await import(`../data-sources/${provider}/index.js`);

      // Provider modules export a 'scripts' array
      if (module.scripts && Array.isArray(module.scripts)) {
        allScripts.push(...module.scripts);
      }
    } catch (error) {
      // Provider not implemented yet, skip silently
      console.log(`Provider ${provider} not found, skipping`);
    }
  }

  return allScripts;
}
```

### Filtering Scripts by Enabled Data Sources

After loading all scripts, filter to keep only those with enabled data sources:

```typescript
async function getEnabledScripts(
  db: PrismaClient,
  allScripts: DataSourceScript[]
): Promise<{ scripts: DataSourceScript[]; dataSourceMap: Map<DataSourceScript, DataSource> }> {
  // Load all enabled data sources
  const dataSources = await db.dataSource.findMany({
    where: { isEnabled: true },
    include: { configs: true }
  });

  // Filter scripts - keep only those with enabled data sources
  const enabledScripts = allScripts.filter(script =>
    dataSources.some(ds => ds.provider === script.dataSourceName)
  );

  // Create a map from script to its data source
  const dataSourceMap = new Map<DataSourceScript, DataSource>();
  for (const script of enabledScripts) {
    const dataSource = dataSources.find(ds => ds.provider === script.dataSourceName);
    if (dataSource) {
      dataSourceMap.set(script, dataSource);
    }
  }

  return { scripts: enabledScripts, dataSourceMap };
}
```

### Provider Module Structure

Each provider module (`data-sources/github/index.ts`) exports an array of scripts:

```typescript
// data-sources/github/index.ts
import { repositoryScript } from './repository.js';
import { contributorScript } from './contributor.js';
import { commitScript } from './commit.js';
import { pullRequestScript } from './pull-request.js';

export const scripts = [
  repositoryScript,
  contributorScript,
  commitScript,
  pullRequestScript
];
```

## Incremental Sync

### Date Range Calculation

```typescript
export async function calculateDateRange(
  db: PrismaClient,
  dataSourceId: string,
  scriptName: string,
  defaultWindowDays: number
): Promise<DateRange> {
  const endDate = new Date();

  // Find last successful run with data
  const lastRun = await db.dataSourceRun.findFirst({
    where: {
      dataSourceId,
      scriptName,
      status: 'COMPLETED',
      lastFetchedDataAt: { not: null }
    },
    orderBy: { completedAt: 'desc' }
  });

  // Use last fetched date, or default to window
  const startDate = lastRun?.lastFetchedDataAt
    ? new Date(lastRun.lastFetchedDataAt)
    : new Date(endDate.getTime() - defaultWindowDays * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
}
```

### Updating Last Fetched Date

```typescript
await db.dataSourceRun.update({
  where: { id: runId },
  data: {
    lastFetchedDataAt: endDate,
    recordsImported: count
  }
});
```

## GitHub Implementation Example

### Repository Script

```typescript
import { Octokit } from '@octokit/rest';
import type { ExecutionContext } from '../../orchestrator/script-loader.js';

// Types
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
}

// Script
export const repositoryScript = {
  dataSourceName: 'GITHUB',
  resource: 'repository',
  dependsOn: [],
  importWindowDays: 365, // Full refresh

  async run(context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });
    const org = context.env.GITHUB_ORG;

    const allRepos: GitHubRepo[] = [];

    // Collect all repos first
    for await (const response of octokit.paginate.iterator(
      octokit.repos.listForOrg,
      { org, per_page: 100 }
    )) {
      allRepos.push(...response.data);
    }

    // Upsert in parallel
    await Promise.all(
      allRepos.map(repo =>
        context.db.repository.upsert({
          where: { fullName: repo.full_name },
          create: {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            provider: 'GITHUB',
            url: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            isPrivate: repo.private,
            lastSyncAt: new Date()
          },
          update: {
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            lastSyncAt: new Date()
          }
        })
      )
    );

    // Update count
    await context.db.dataSourceRun.update({
      where: { id: context.runId },
      data: { recordsImported: allRepos.length }
    });
  }
};
```

### Commit Script (Incremental)

```typescript
export const commitScript = {
  dataSourceName: 'GITHUB',
  resource: 'commit',
  dependsOn: ['repository'],
  importWindowDays: 90,

  async run(context: ExecutionContext) {
    const octokit = new Octokit({ auth: context.env.GITHUB_TOKEN });

    // Get all repositories
    const repos = await context.db.repository.findMany({
      where: { provider: 'GITHUB' }
    });

    for (const repo of repos) {
      const [owner, repoName] = repo.fullName.split('/');
      const allCommits = [];

      // Fetch commits since startDate
      for await (const response of octokit.paginate.iterator(
        octokit.repos.listCommits,
        {
          owner,
          repo: repoName,
          since: context.startDate.toISOString(),
          until: context.endDate.toISOString(),
          per_page: 100
        }
      )) {
        allCommits.push(...response.data);
      }

      // Upsert commits in parallel
      await Promise.all(
        allCommits.map(commit =>
          context.db.commit.upsert({
            where: {
              repositoryId_sha: {
                repositoryId: repo.id,
                sha: commit.sha
              }
            },
            create: {
              sha: commit.sha,
              message: commit.commit.message,
              authorId: authorId, // Need to resolve contributor
              committedAt: new Date(commit.commit.author.date),
              repositoryId: repo.id,
              linesAdded: commit.stats?.additions || 0,
              linesRemoved: commit.stats?.deletions || 0,
              filesChanged: commit.files?.length || 0
            },
            update: {
              message: commit.commit.message,
              linesAdded: commit.stats?.additions || 0,
              linesRemoved: commit.stats?.deletions || 0,
              filesChanged: commit.files?.length || 0
            }
          })
        )
      );
    }
  }
};
```

## Orchestrator Flow

### Main Entry Point

```typescript
import PGraph from 'p-graph';
import { db } from '~/db.server.js';

export async function runOrchestrator() {
  // 0. Acquire global orchestrator lock (system-wide)
  const globalLock = await acquireGlobalOrchestratorLock(db);

  if (!globalLock) {
    console.log('Another orchestrator is running, exiting');
    return;
  }

  try {
    // 1. Load all import scripts (scan data-sources/ directory)
    const allScripts = await loadAllImportScripts();

    // 2. Get enabled scripts and their data sources
    const { scripts: enabledScripts, dataSourceMap } = await getEnabledScripts(db, allScripts);

    if (enabledScripts.length === 0) {
      console.log('No enabled scripts to run');
      return;
    }

    // 3. Build p-graph with all enabled scripts
    const graph = new PGraph();

    for (const script of enabledScripts) {
      const dataSource = dataSourceMap.get(script)!;

      graph.add(
        async () => executeScriptWithLock(db, dataSource, script),
        script.dependsOn
      );
    }

    // 4. Execute with dependency resolution and parallelization
    await graph.run();

    // 5. Update lastSyncAt for all data sources
    const uniqueDataSources = new Set(dataSourceMap.values());
    for (const dataSource of uniqueDataSources) {
      await db.dataSource.update({
        where: { id: dataSource.id },
        data: { lastSyncAt: new Date() }
      });
    }

    console.log('Orchestrator completed successfully');
  } finally {
    // 6. Release global lock
    await releaseGlobalOrchestratorLock(db);
  }
}
```


## Scheduler

### Setup

```typescript
import cron from 'node-cron';
import { runOrchestrator } from './orchestrator/index.js';

export interface SchedulerConfig {
  cronExpression: string;
}

export function startScheduler(
  config: SchedulerConfig = { cronExpression: '*/15 * * * *' }
) {
  console.log(`Starting scheduler: ${config.cronExpression}`);

  cron.schedule(config.cronExpression, async () => {
    console.log('Running orchestrator...');
    try {
      await runOrchestrator();
      console.log('Orchestrator completed');
    } catch (error) {
      console.error('Orchestrator failed:', error);
    }
  });
}
```

### Entry Point

```typescript
// crons/index.ts
import { startScheduler } from './scheduler.js';

startScheduler(); // Every 15 minutes by default

console.log('Cron scheduler started');
```

## Database Schema Reference

### DataSource

```prisma
model DataSource {
  id                  String             @id @default(cuid())
  organizationId      String             @map("organization_id")
  name                String
  provider            DataSourceProvider @map("provider")
  isEnabled           Boolean            @default(true) @map("is_enabled")
  syncIntervalMinutes Int?               @map("sync_interval_minutes")
  lastSyncAt          DateTime?          @map("last_sync_at")

  configs DataSourceConfig[]
  runs    DataSourceRun[]

  @@schema("data")
}
```

### DataSourceConfig

```prisma
model DataSourceConfig {
  id           String  @id @default(cuid())
  dataSourceId String  @map("data_source_id")
  key          String
  value        String
  isSecret     Boolean @default(false) @map("is_secret")

  @@unique([dataSourceId, key])
  @@schema("data")
}
```

### DataSourceRun

```prisma
model DataSourceRun {
  id                String              @id @default(cuid())
  dataSourceId      String              @map("data_source_id")
  status            DataSourceRunStatus
  scriptName        String?             @map("script_name")
  recordsImported   Int                 @default(0)
  recordsFailed     Int                 @default(0)
  startedAt         DateTime            @map("started_at")
  completedAt       DateTime?           @map("completed_at")
  durationMs        Int?                @map("duration_ms")
  errorMessage      String?             @map("error_message")
  lastFetchedDataAt DateTime?           @map("last_fetched_data_at")

  logs ImportLog[]

  @@schema("data")
}
```

### ImportLog

```prisma
model ImportLog {
  id              String         @id @default(cuid())
  dataSourceRunId String         @map("data_source_run_id")
  level           ImportLogLevel
  message         String
  details         String?        // JSON
  recordId        String?        @map("record_id")

  @@schema("data")
}
```

## Initial Setup

### Creating a Data Source via API or Script

```typescript
await db.dataSource.create({
  data: {
    organizationId: 'org-id',
    name: 'GitHub - MyOrg',
    provider: 'GITHUB',
    isEnabled: true,
    syncIntervalMinutes: 15,
    configs: {
      create: [
        { key: 'GITHUB_TOKEN', value: 'ghp_xxxx', isSecret: true },
        { key: 'GITHUB_ORG', value: 'my-org', isSecret: false }
      ]
    }
  }
});
```

## Error Handling

### Script-Level Errors
- Caught and logged to ImportLog
- Run marked as FAILED
- Other scripts continue execution
- Next scheduler run will retry

### Orchestrator-Level Errors
- Logged to console
- Scheduler continues running
- Next interval will retry

### Network/API Errors
- Should be caught within scripts
- Implement retry logic with exponential backoff
- Log warnings for transient errors

## Performance Considerations

### Parallel Operations
- Use `Promise.all` for database operations
- Batch large datasets (50-100 records per batch)
- Use Octokit pagination iterators

### Database Queries
- Use `findMany` with `include` to reduce round trips
- Index on frequently queried fields (already in schema)
- Use transactions for atomic operations

### Rate Limiting
- Respect API rate limits (GitHub: 5000/hour authenticated)
- Implement backoff on 429 responses
- Consider using conditional requests (ETags)
