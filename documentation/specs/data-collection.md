# Data Collection System Specification

## Overview

The data collection system is a tenant-based, concurrent execution framework that orchestrates data source plugins to import data from external systems into tenant-isolated databases. The system supports incremental data collection, dependency management, and configurable execution windows.

## System Architecture

### Core Components

1. **Cron Orchestrator** (`apps/crons/src/import.ts`)
   - Main entry point that coordinates data collection across all tenants
   - Queries `TenantDataSourceConfig` to determine tenant-specific configurations
   - Builds execution graphs per tenant using dependency resolution
   - Manages concurrent execution with database locking

2. **Data Source Plugins** (`plugins/data-sources/*/`)
   - Self-contained modules that implement data collection from external systems
   - Follow standardized interface for discovery and execution
   - Support incremental collection with configurable import windows

3. **Configuration Management** (`TenantDataSourceConfig`)
   - Stores tenant-specific environment variables (API keys, endpoints, etc.)
   - Enables per-tenant data source configuration
   - Supports dynamic enabling/disabling of data sources per tenant

4. **Execution Tracking** (`DataSourceRun`)
   - Tracks execution history per tenant, data source, and script
   - Provides concurrency control through database locking
   - Maintains incremental collection state

## Data Models

### Enhanced DataSourceRun Schema

```prisma
model DataSourceRun {
  id                   String                @id @default(cuid())
  tenantId             String                @map("tenant_id")
  dataSource           String                @map("data_source") // e.g., "github"
  script               String                // e.g., "repository.ts"
  startedAt            DateTime              @default(now()) @map("started_at")
  completedAt          DateTime?             @map("completed_at")
  status               DataSourceRunStatus   @default(RUNNING)
  error                String?
  lastFetchedDataDate  DateTime?             @map("last_fetched_data_date")
  
  @@unique([tenantId, dataSource, script])
  @@index([tenantId])
  @@index([dataSource])
  @@index([tenantId, dataSource])
  @@map("data_source_run")
}
```

### TenantDataSourceConfig (Existing)

```prisma
model TenantDataSourceConfig {
  id         String   @id @default(cuid())
  tenantId   String   @map("tenant_id")
  dataSource String   @map("data_source")
  key        String
  value      String
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, dataSource, key])
  @@index([tenantId])
  @@map("tenant_data_source_config")
}
```

## Plugin Interface Specification

### Required Exports

```typescript
// Resources this plugin provides/populates
export const resources: string[] = ["repository"];

// Other data sources this plugin depends on (optional)
export const dependencies: string[] = ["team"]; 

// Import window duration in milliseconds (optional, defaults to 24h)
export const importWindowDuration = 86400 * 1000;

// Main execution function
export async function run(
  env: Record<string, string>,
  db: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<void>
```

### Plugin Discovery

- Plugins are discovered by scanning `plugins/data-sources/*/` directories
- Each `.ts` file (except `.test.ts`) is loaded as a potential data source script
- Script names are derived from: `{dataSource}/{scriptName}` (e.g., "github/repository") has data_source "github" and script "repository"
- All scripts from a data source share that data sources TenantDataSourceConfig environment variables

## Execution Flow

### 1. Configuration Discovery

```typescript
// Query all tenant configurations
const configs = await db.tenantDataSourceConfig.findMany({
  include: { tenant: true }
});

// Group by tenant and data source
const tenantConfigs = groupBy(configs, config => 
  `${config.tenantId}:${config.dataSource}`
);
```

### 2. Environment Building

```typescript
// Build environment object per tenant/dataSource
const environments = tenantConfigs.map(([key, configs]) => {
  const [tenantId, dataSource] = key.split(':');
  const env = configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, string>);
  
  return { tenantId, dataSource, env };
});
```

### 3. Plugin Scanning

```typescript
// Discover all data source scripts
const scriptPaths = await fg([
  "../../plugins/data-sources/*/*.ts",
  "!../../plugins/data-sources/*/*.test.ts"
]);

const scripts = await Promise.all(scriptPaths.map(async (path) => {
  const module = await import(path);
  const dataSource = path.split('/').slice(-2)[0];
  const scriptName = basename(path, '.ts');
  
  return {
    name: `${dataSource}-${scriptName}`,
    dataSource,
    scriptName,
    resources: module.resources || [],
    dependencies: module.dependencies || [],
    importWindowDuration: module.importWindowDuration || 86400 * 1000,
    run: module.run
  };
}));
```

### 4. Dependency Graph Construction

```typescript
// Build per-tenant dependency graphs
const tenantGraphs = new Map();

for (const { tenantId, dataSource, env } of environments) {
  const tenantScripts = scripts.filter(s => s.dataSource === dataSource);
  const graph = buildDependencyGraph(tenantScripts);
  
  tenantGraphs.set(tenantId, {
    scripts: tenantScripts,
    graph,
    env
  });
}
```

### 5. Concurrent Execution

```typescript
// Execute all tenant graphs concurrently
const executions = Array.from(tenantGraphs.entries()).map(
  ([tenantId, { scripts, graph, env }]) => 
    executeForTenant(tenantId, scripts, graph, env)
);

await Promise.all(executions);
```

## Concurrency Control

### Database Locking Strategy

```sql
-- Acquire lock for specific tenant + dataSource + script
SELECT * FROM data_source_run 
WHERE tenant_id = ? AND data_source = ? AND script = ?
FOR UPDATE SKIP LOCKED;
```

### Lock Granularity

- **Tenant Level**: No coordination between tenants
- **Data Source Level**: Scripts within same data source can run in parallel
- **Script Level**: Exact same script cannot run concurrently for same tenant

### Execution Isolation

```typescript
async function executeScript(
  tenantId: string,
  script: DataSourceScript,
  env: Record<string, string>
) {
  // Acquire lock
  const lockResult = await db.$queryRaw`
    SELECT id FROM data_source_run 
    WHERE tenant_id = ${tenantId} 
    AND data_source = ${script.dataSource}
    AND script = ${script.scriptName}
    FOR UPDATE SKIP LOCKED
  `;
  
  if (lockResult.length === 0) {
    // Another process is already running this script
    return;
  }
  
  // Execute with lock held
  await executeWithTracking(tenantId, script, env);
}
```

## Incremental Data Collection

### Date Range Calculation

```typescript
async function calculateDateRange(
  tenantId: string,
  dataSource: string,
  scriptName: string,
  importWindowDuration: number
): Promise<{ startDate: Date; endDate: Date }> {
  const lastRun = await db.dataSourceRun.findFirst({
    where: { tenantId, dataSource, script: scriptName },
    orderBy: { startedAt: 'desc' }
  });
  
  const endDate = new Date();
  const startDate = lastRun?.lastFetchedDataDate 
    ? new Date(lastRun.lastFetchedDataDate.getTime())
    : new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
    
  // Respect import window duration
  const maxStartDate = new Date(endDate.getTime() - importWindowDuration);
  if (startDate < maxStartDate) {
    startDate.setTime(maxStartDate.getTime());
  }
  
  return { startDate, endDate };
}
```

### Progress Tracking

```typescript
async function executeWithTracking(
  tenantId: string,
  script: DataSourceScript,
  env: Record<string, string>
) {
  const { startDate, endDate } = await calculateDateRange(
    tenantId, 
    script.dataSource, 
    script.scriptName,
    script.importWindowDuration
  );
  
  // Create/update run record
  const runRecord = await db.dataSourceRun.upsert({
    where: {
      tenantId_dataSource_script: {
        tenantId,
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
      tenantId,
      dataSource: script.dataSource,
      script: script.scriptName,
      status: 'RUNNING',
      startedAt: new Date()
    }
  });
  
  try {
    // Execute the script
    await script.run(env, db, tenantId, startDate, endDate);
    
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

## Error Handling and Recovery

### Failure Isolation

- Tenant failures don't affect other tenants
- Script failures don't affect other scripts in the same tenant
- Failed runs can be retried on subsequent cron executions

### Recovery Strategies

1. **Automatic Retry**: Failed runs are automatically retried on next cron execution
2. **Incremental Recovery**: Failed runs don't lose progress - next execution picks up from last successful point
3. **Manual Intervention**: Administrators can reset `lastFetchedDataDate` to force full re-import

## Configuration Management

### Environment Variables per Tenant

```typescript
// Example tenant configuration
const tenantConfig = [
  { tenantId: 'tenant1', dataSource: 'github', key: 'GITHUB_TOKEN', value: 'ghp_...' },
  { tenantId: 'tenant1', dataSource: 'github', key: 'GITHUB_ORG', value: 'myorg' },
  { tenantId: 'tenant2', dataSource: 'github', key: 'GITHUB_TOKEN', value: 'ghp_...' },
  { tenantId: 'tenant2', dataSource: 'jira', key: 'JIRA_URL', value: 'https://...' }
];
```

### Dynamic Configuration

- Data sources can be enabled/disabled per tenant by presence/absence of configuration
- Configuration changes take effect on next cron execution
- No application restart required for configuration changes

## Performance Considerations

### Concurrency Control

- Use `p-graph` for dependency-aware parallel execution within tenant
- Database connection pooling for concurrent tenant processing
- Configurable concurrency limits per tenant

### Memory Management

- Stream-based processing for large datasets
- Batch operations for database inserts/updates
- Cleanup of completed execution records

### Monitoring and Observability

- Execution metrics per tenant/data source
- Performance tracking for import windows
- Error rate monitoring and alerting

## Security Considerations

### Tenant Isolation

- All database queries must include `tenantId` filter
- Environment variables are isolated per tenant
- No cross-tenant data access possible

### Credential Management

- Encrypted storage of API tokens and secrets
- Secure transmission of environment variables to plugins
- Regular rotation of credentials

### Data Protection

- Audit logging of all data collection activities
- Compliance with data retention policies
- Secure handling of sensitive data from external sources