# Session 07: Cron Data Import System Redesign

## Session Overview

This session focused on redesigning the cron data import system to support tenant-based execution with proper isolation, concurrency control, and incremental data collection. The session involved understanding Turbo caching issues with tests and then creating a comprehensive plan for the new system architecture.

## Key Topics Covered

### 1. Turbo Caching Issue Investigation
- **Problem**: GitHub data source test was passing in `yarn test` but failing when run individually
- **Root Cause**: Turbo was caching old test results, masking the real failure when function signature changed
- **Solution**: Updated test to properly pass required parameters (`startDate`, `endDate`, `tenantId`)
- **Prevention**: Use `--force` flag, disable caching for tests, or run individual package tests

### 2. Tenant-Based Data Source Execution Design

#### Current System Problems
- Global data source discovery approach
- No tenant-specific configuration
- Race conditions between concurrent runs
- No incremental collection tracking
- Coupling between tenants

#### New System Requirements
- Tenant-specific data source configuration via `TenantDataSourceConfig`
- Proper concurrency control with database locking
- Incremental data collection with state tracking
- Complete tenant isolation in execution
- Support for configurable import windows

### 3. System Architecture Changes

#### Database Schema Updates
- **DataSourceRun** table enhancements:
  - Add `tenantId` field for tenant isolation
  - Add `script` field to track specific data source scripts
  - Add unique constraint on `(tenantId, dataSource, script)`
  - Add proper indexing for tenant-scoped queries

#### Data Source Plugin Interface
- **New signature**: `run(env, db, tenantId, startDate, endDate)`
- **Optional export**: `importWindowDuration` (defaults to 24 hours)
- **Existing exports**: `resources`, `dependencies` (for dependency graph)

#### Execution Flow
1. Query `TenantDataSourceConfig` to get tenant-specific configurations
2. Group by tenant and dataSource to build environment objects
3. Scan data source plugins to discover scripts and dependencies
4. Build dependency graphs per tenant using p-graph
5. Execute with `SELECT FOR UPDATE ... SKIP LOCKED` for concurrency control
6. Calculate incremental date ranges (90-day default for first runs)
7. Update DataSourceRun with execution status and progress

### 4. Key Implementation Details

#### Concurrency Control
- Use `SELECT FOR UPDATE ... SKIP LOCKED` on DataSourceRun table
- Prevent duplicate runs of same tenant + dataSource + script combination
- Allow parallel execution of different combinations

#### Incremental Collection
- Use `lastFetchedDataDate` from DataSourceRun for start date calculation
- Default to 90 days ago for first runs
- Respect plugin-specific `importWindowDuration`
- Handle failures by allowing retries on subsequent runs

#### Tenant Isolation
- Each tenant has independent configuration and execution
- No coordination between tenants during data collection
- Error isolation - failures in one tenant don't affect others
- Scalable parallel processing with p-graph managing concurrency

## Documentation Updates Created

### 1. DataSourceRun Schema (Documentation)
- Added `tenantId` and `script` fields
- Added unique constraint and proper indexing
- Updated comments to reflect new tenant-based approach

### 2. PROGRESS.md Updates
- Replaced "Data Source Dependencies" with "Tenant-Based Data Source Execution"
- Added comprehensive implementation checklist
- Included all new requirements and interface changes

### 3. ARCHITECTURE.md Enhancements
- Updated data orchestration description for tenant-based approach
- Added detailed "Tenant-Based Data Collection Architecture" section
- Included Mermaid flow diagrams showing execution flow
- Documented key components, interfaces, and benefits

### 4. ADR-009 Creation
- Created comprehensive Architecture Decision Record
- Documented problem context, solution, and trade-offs
- Included implementation notes and alternatives considered
- Provided proper architectural justification

## Technical Benefits

### Scalability
- True tenant isolation in data collection
- Parallel processing of different tenant/dataSource combinations
- Configurable import windows per data source type

### Reliability
- Database-level concurrency control prevents race conditions
- Incremental collection with proper state tracking
- Error isolation between tenants
- Retry capabilities for failed runs

### Flexibility
- Tenant-specific environment configuration
- Configurable data sources per tenant
- Plugin-specific import window durations
- Dependency graph execution per tenant

## Implementation Approach

The session focused on planning and documentation rather than implementation. The comprehensive plan includes:

1. **Database schema updates** for tenant isolation and concurrency control
2. **Plugin interface updates** with new signature and optional exports
3. **Cron system redesign** with tenant-based execution flow
4. **Concurrency mechanisms** using database locking
5. **Incremental collection** with proper state management

## Next Steps

When ready to implement:
1. Update DataSourceRun database schema
2. Modify existing data source plugins to new interface
3. Rewrite cron import orchestration logic
4. Add comprehensive testing for tenant isolation and concurrency
5. Update plugin development documentation

## Key Learnings

- Turbo caching can mask test failures - use `--force` flag when needed
- Tenant isolation requires careful design at the database and application level
- Concurrency control is crucial for multi-tenant data collection systems
- Incremental collection needs proper state tracking per tenant
- Documentation-first approach helps validate architecture before implementation