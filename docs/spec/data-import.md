# Data Import System Specification

## Overview

The data import system is a distributed job orchestration framework that:
- Loads enabled DataSource records from the database
- Builds environment from DataSourceConfig key-value pairs
- Executes provider-specific scripts with dependency resolution using `p-graph`
- Uses database row locking (`SELECT FOR UPDATE SKIP LOCKED`) for distributed coordination
- Tracks execution in DataSourceRun and ImportLog tables
- Supports incremental sync via lastFetchedDataAt

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

### 2. Generic Resource Names

Scripts use generic, provider-agnostic resource names for dependencies:

```typescript
// ✅ Correct - dependencies are generic
export const githubCommitScript = {
  name: 'github:commit',        // Script ID is provider-scoped
  dependsOn: ['repository'],    // Generic dependency
  provides: ['commit'],         // Generic resource provided
  importWindowDays: 90,
  async run(context) { ... }
};

// ❌ Wrong - don't scope dependencies to provider
{
  dependsOn: ['github:repository']  // Don't do this
}
```

This allows cross-provider dependency resolution:
- GitHub commits depend on "repository" (satisfied by github:repository)
- GitLab commits also depend on "repository" (satisfied by gitlab:project)

### 3. Colocated Types

Each file defines its own types at the top:

```typescript
// execution/date-calculator.ts

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export async function calculateDateRange(
  db: PrismaClient,
  dataSourceId: string,
  scriptName: string,
  defaultWindowDays: number
): Promise<DateRange> {
  // implementation
}
```

### 4. Parallel Operations

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

Locking happens at the **DataSource level**, not the script level. This is simpler and more efficient.

### How It Works

1. **Start transaction**
2. **SELECT FOR UPDATE SKIP LOCKED** to claim ONE data source
3. **Process all scripts** for that data source (lock held)
4. **Update `lastSyncAt`** when complete (lock still held)
5. **Commit transaction** - lock automatically releases
6. **Repeat** for next data source

### Critical: Transaction Scope

**IMPORTANT:** The `SELECT FOR UPDATE` lock is only held for the duration of the transaction. You MUST keep the same transaction open throughout processing:

```typescript
// ✅ CORRECT - Lock held throughout processing
await db.$transaction(async (tx) => {
  const [ds] = await tx.$queryRaw`SELECT ... FOR UPDATE SKIP LOCKED`;
  await processDataSource(tx, ds);
  await tx.dataSource.update({ ... lastSyncAt ... });
}); // Lock released here

// ❌ WRONG - Lock released immediately, defeats the purpose
const [ds] = await db.$transaction(async (tx) => {
  return await tx.$queryRaw`SELECT ... FOR UPDATE SKIP LOCKED`;
}); // Lock released here!
await processDataSource(db, ds); // Another process could grab this now
```

### Implementation

```typescript
async function getAndLockOneDataSource(tx: PrismaClient) {
  // Lock ONE data source that needs syncing
  // SKIP LOCKED means if another process has it locked, we skip it
  const [dataSource] = await tx.$queryRaw<DataSource[]>`
    SELECT
      ds.*,
      json_agg(json_build_object('key', dsc.key, 'value', dsc.value)) as configs
    FROM data.data_source ds
    LEFT JOIN data.data_source_config dsc ON dsc.data_source_id = ds.id
    WHERE ds.is_enabled = true
      AND (ds.last_sync_at IS NULL
           OR ds.last_sync_at < NOW() - (ds.sync_interval_minutes || ' minutes')::INTERVAL)
    GROUP BY ds.id
    ORDER BY ds.last_sync_at ASC NULLS FIRST
    LIMIT 1
    FOR UPDATE OF ds SKIP LOCKED
  `;

  return dataSource;
}
```

### Benefits

- ✅ **Simple** - No complex script-level locking logic
- ✅ **Distributed-safe** - `SKIP LOCKED` prevents duplicate work
- ✅ **Natural queueing** - Oldest syncs processed first
- ✅ **Short lock duration** - One data source at a time
- ✅ **Automatic distribution** - Multiple processes work on different data sources
- ✅ **Clean separation** - DataSourceRun is just for history/logging, not locking

## Script Interface

### DataSourceScript

```typescript
export interface DataSourceScript {
  name: string;                     // e.g., 'github:repository'
  dependsOn: string[];              // Generic: ['repository'], ['commit']
  provides: string[];               // Generic: ['repository'], ['commit']
  importWindowDays: number;         // Default lookback window (e.g., 90)
  run: (context: ExecutionContext) => Promise<void>;
}
```

### ExecutionContext

```typescript
export interface ExecutionContext {
  dataSourceId: string;             // ID of the DataSource record
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

### Benefits

- ✅ **No custom code** - Let p-graph handle topological sorting
- ✅ **Automatic parallelization** - Scripts run in parallel when possible
- ✅ **Circular dependency detection** - p-graph throws errors for cycles
- ✅ **Well-tested** - Battle-tested npm package

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
  name: 'github:repository',
  dependsOn: [],
  provides: ['repository'],
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
  name: 'github:commit',
  dependsOn: ['repository'],
  provides: ['commit'],
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

Process data sources one at a time, each in its own transaction:

```typescript
export async function runOrchestrator() {
  // Process all available data sources sequentially
  // Each iteration locks one data source, processes it, and releases
  while (true) {
    const processed = await processNextDataSource(db);

    if (!processed) {
      break; // No more data sources need syncing
    }
  }
}
```

### Process Next Data Source (with Transaction)

Each data source is processed in a single transaction from lock to lastSyncAt update:

```typescript
async function processNextDataSource(db: PrismaClient): Promise<boolean> {
  return await db.$transaction(async (tx) => {
    // Lock and get ONE data source
    const [dataSource] = await tx.$queryRaw<DataSource[]>`
      SELECT
        ds.*,
        json_agg(
          json_build_object('key', dsc.key, 'value', dsc.value)
        ) as configs
      FROM data.data_source ds
      LEFT JOIN data.data_source_config dsc ON dsc.data_source_id = ds.id
      WHERE ds.is_enabled = true
        AND (ds.last_sync_at IS NULL
             OR ds.last_sync_at < NOW() - (ds.sync_interval_minutes || ' minutes')::INTERVAL)
      GROUP BY ds.id
      ORDER BY ds.last_sync_at ASC NULLS FIRST
      LIMIT 1
      FOR UPDATE OF ds SKIP LOCKED
    `;

    if (!dataSource) {
      return false; // No work available
    }

    // Process it (lock held throughout)
    await processDataSource(tx, dataSource);

    // Update last sync time (lock still held)
    await tx.dataSource.update({
      where: { id: dataSource.id },
      data: { lastSyncAt: new Date() }
    });

    console.log(`Completed sync for ${dataSource.name}`);
    return true; // Processed one data source
  });
  // Transaction commits here, lock released
}
```

### Process Data Source

```typescript
import PGraph from 'p-graph';

async function processDataSource(tx: PrismaClient, dataSource: DataSource) {
  // Build environment from configs
  const env = dataSource.configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, string>);

  // Load scripts for this provider
  const scripts = await loadScriptsForProvider(dataSource.provider);

  if (scripts.length === 0) {
    console.log(`No scripts for provider ${dataSource.provider}`);
    return;
  }

  // Create dependency graph
  const graph = new PGraph();

  // Add all scripts to the graph
  for (const script of scripts) {
    graph.add(
      async () => executeScript(tx, dataSource.id, script, env),
      script.dependsOn  // Dependencies
    );
  }

  // Execute with automatic dependency resolution and parallelization
  await graph.run();
}
```

### Execute Script

```typescript
async function executeScript(
  tx: PrismaClient,
  dataSourceId: string,
  script: DataSourceScript,
  env: Record<string, string>
) {
  // Create a new run record
  const run = await tx.dataSourceRun.create({
    data: {
      dataSourceId,
      scriptName: script.name,
      status: 'RUNNING',
      startedAt: new Date(),
      recordsImported: 0,
      recordsFailed: 0
    }
  });

  const startTime = Date.now();

  try {
    // Calculate date range for incremental sync
    const { startDate, endDate } = await calculateDateRange(
      tx,
      dataSourceId,
      script.name,
      script.importWindowDays
    );

    // Execute script
    await script.run({
      dataSourceId,
      env,
      db: tx,  // Pass transaction to script
      startDate,
      endDate,
      runId: run.id
    });

    // Mark as completed
    await tx.dataSourceRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        lastFetchedDataAt: endDate
      }
    });
  } catch (error) {
    // Mark as failed
    await tx.dataSourceRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: error.message
      }
    });

    // Log error
    await tx.importLog.create({
      data: {
        dataSourceRunId: run.id,
        level: 'ERROR',
        message: error.message,
        details: JSON.stringify({ stack: error.stack })
      }
    });

    // Don't throw - let other scripts continue
    console.error(`Script ${script.name} failed:`, error);
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

### Additional Providers
- GitLab (similar structure to GitHub)
- Jenkins (CI/CD data)
- JIRA (project management)
- SonarQube (code quality)
