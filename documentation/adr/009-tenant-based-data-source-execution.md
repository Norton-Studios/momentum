# ADR-009: Tenant-Based Data Source Execution

## Status

Accepted

## Context

The current data collection system uses a global approach where the cron job discovers all data source plugins and executes them based on hardcoded configurations. This approach has several limitations:

1. **No tenant isolation**: All tenants share the same data source configuration
2. **No tenant-specific environment variables**: Cannot configure different API keys, endpoints, or settings per tenant
3. **Race conditions**: Multiple cron jobs can run the same data source simultaneously
4. **No incremental collection tracking**: Each run starts from scratch or uses global state
5. **Coupling between tenants**: Issues with one tenant's data source can affect others

As we move toward a multi-tenant SaaS model, we need a system that:
- Allows tenant-specific data source configuration
- Prevents race conditions in data collection
- Supports incremental data collection with proper state tracking
- Provides tenant isolation in both configuration and execution

## Decision

We will implement a tenant-based data source execution system with the following components:

### 1. Enhanced DataSourceRun Schema

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
}
```

### 2. Configuration-Driven Execution

- Use existing `TenantDataSourceConfig` table to determine which data sources to run per tenant
- Group configuration by `tenantId` and `dataSource` to build environment objects
- Pass flattened environment variables to data source plugins

### 3. Updated Data Source Plugin Interface

```typescript
// Required exports
export const provides: string[] = ["repository"];
export const dependencies: string[] = ["team"]; 
export const importWindowDuration = 86400 * 1000; // optional, defaults to 24h

// Main execution function
export async function run(
  env: Record<string, string>,
  db: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<void>
```

### 4. Concurrency Control

- Use `SELECT FOR UPDATE ... SKIP LOCKED` on DataSourceRun table
- Unique constraint on `(tenantId, dataSource, script)` prevents duplicate runs
- Allows parallel execution of different tenant/dataSource/script combinations

### 5. Incremental Data Collection

- Calculate date ranges based on `lastFetchedDataDate` from previous runs
- Default to 90 days ago for first runs (no previous DataSourceRun entry)
- Respect plugin-specific `importWindowDuration` for window sizing
- Handle failures gracefully by allowing retries on subsequent cron runs

### 6. Execution Flow

1. Query `TenantDataSourceConfig` to get all configured data sources
2. Group by tenant and dataSource to build environment objects
3. Scan data source plugins to discover available scripts and dependencies
4. Build dependency graphs per tenant using p-graph
5. Execute with concurrency control using database locking
6. Update DataSourceRun with success/failure status and lastFetchedDataDate

## Consequences

### Positive

- **True tenant isolation**: Each tenant has independent data collection configuration and execution
- **Prevents race conditions**: Database-level locking ensures no duplicate runs
- **Incremental collection**: Proper state tracking allows efficient data collection
- **Scalability**: Can process multiple tenants in parallel with controlled concurrency
- **Flexibility**: Tenants can configure different data sources and environment variables
- **Error isolation**: Failures in one tenant don't affect others
- **Auditability**: Full tracking of data collection runs per tenant

### Negative

- **Increased complexity**: More sophisticated execution logic and state management
- **Database overhead**: Additional queries and locking mechanisms
- **Migration effort**: Existing data sources need interface updates
- **Testing complexity**: Need to test tenant isolation and concurrency scenarios

### Neutral

- **Performance**: Should be similar or better due to improved incremental collection
- **Backward compatibility**: Requires updating existing data source plugins

## Implementation Notes

1. **Database Migration**: Add new fields to DataSourceRun and update indexes
2. **Plugin Updates**: Update all existing data source plugins to new interface
3. **Cron System**: Rewrite import orchestration logic
4. **Testing**: Add comprehensive tests for tenant isolation and concurrency
5. **Documentation**: Update plugin development guide with new interface requirements

## Alternatives Considered

1. **Global configuration with tenant filtering**: Would still have race conditions and coupling
2. **Separate cron jobs per tenant**: Would not scale well and increase infrastructure complexity
3. **Event-driven system**: Would add complexity without solving the core tenant isolation issues

## References

- [TenantDataSourceConfig schema](../../plugins/resources/tenant/db/schema.prisma)
- [Current DataSourceRun schema](../../apps/crons/src/db/schema.prisma)
- [Existing cron import system](../../apps/crons/src/import.ts)