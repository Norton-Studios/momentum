# ADR-010: Remove instanceId from TenantDataSourceConfig

## Status
Accepted

## Context
The `TenantDataSourceConfig` model originally included an `instanceId` field to theoretically support multiple instances of the same data source provider per tenant. This field was part of a unique constraint: `@@unique([tenantId, dataSource, instanceId, key])`.

During development, it became clear that:
- No concrete use case exists for multiple instances of the same data source provider per tenant
- The field added unnecessary complexity to the data model, API, and UI
- Configuration management became more complex without providing real value
- The concept was over-engineered without clear business requirements

## Problem
The `instanceId` field introduced complexity without corresponding value:
- API endpoints required instance-specific routing
- UI components needed to handle instance selection
- Database queries were more complex
- Testing required additional scenarios
- No clear user story justified the capability

## Decision
Remove the `instanceId` field from `TenantDataSourceConfig` and simplify the model to allow only one configuration per data source per tenant.

### Changes Made:
1. **Database Schema**: Removed `instanceId` field from `TenantDataSourceConfig`
2. **Unique Constraint**: Simplified from `[tenantId, dataSource, instanceId, key]` to `[tenantId, dataSource, key]`
3. **API**: Removed PUT/DELETE endpoints for instance-specific config management
4. **UI**: Simplified configuration forms to prevent multiple configs per provider
5. **Tests**: Removed test cases for deleted endpoints

### Migration Path:
```sql
-- The unique constraint change handles this automatically
-- Existing single instances remain valid
-- No data migration required for typical use cases
```

## Consequences

### Positive:
- **Simplified data model**: Easier to understand and maintain
- **Reduced complexity**: Less code to test and maintain
- **Clearer user experience**: One configuration per data source is intuitive
- **Better performance**: Simpler queries and constraints
- **Easier debugging**: Fewer variables in configuration resolution

### Negative:
- **Reduced theoretical flexibility**: Cannot support multiple instances per provider
- **Breaking change**: Applications relying on instanceId will need updates
- **Migration required**: Though minimal for typical deployments

### Neutral:
- **Current functionality preserved**: All existing use cases continue to work
- **Future extensibility**: Can be re-added if concrete use cases emerge

## Rationale
This decision follows the principle of "You Aren't Gonna Need It" (YAGNI). The instanceId field was speculative functionality that added complexity without proven value. Removing it:

1. Simplifies the system architecture
2. Reduces maintenance burden
3. Makes the system easier to understand and use
4. Follows the pattern established in similar multi-tenant systems
5. Can be reconsidered if real use cases emerge

## Related
- [ADR-007: Multi-tenant data isolation](./007-multi-tenant-data-isolation.md)
- [ADR-009: Tenant-based data source execution](./009-tenant-based-data-source-execution.md)
- Implementation commits: `60a03d8`, `f538118`

## Date
2025-01-08