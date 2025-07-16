# ADR 007: Multi-tenant Data Isolation

- **Status:** Accepted
- **Date:** 2025-07-16
- **Deciders:** Development Team

## Context and Problem Statement

The Momentum application needs to support multi-tenant SaaS deployment where multiple organizations can use the same application instance while maintaining complete data isolation. Each tenant must only be able to access their own data, and there must be no possibility of data leakage between tenants.

## Decision Drivers

- **Data Security:** Absolute isolation between tenant data to prevent accidental or malicious access
- **Performance:** Efficient querying without significant overhead for tenant filtering
- **Maintainability:** Simple, consistent implementation across all data models
- **Scalability:** Support for growing number of tenants without architectural changes
- **Development Experience:** Clear patterns for developers to follow when creating new resources

## Considered Options

1. **Separate Databases per Tenant:** Each tenant gets their own database instance
2. **Schema-based Isolation:** Each tenant gets their own schema within a shared database
3. **Row-level Security with tenantId:** Single database with tenant ID column and application-level filtering
4. **Database Row-Level Security (RLS):** PostgreSQL native row-level security policies

## Decision Outcome

**Chosen Option:** "Row-level Security with tenantId" was selected.

### Implementation Details

- Add `tenantId` field to all core resource models (commit, repository, contributor, build, merge_request, pipeline)
- All API endpoints filter queries by the authenticated user's tenant ID
- Database schema uses snake_case `tenant_id` with Prisma `@map("tenant_id")` for camelCase aliases
- Tenant filtering is applied at the application layer in all CRUD operations

### Rationale

This approach provides the best balance of our decision drivers:

- **Data Security:** Complete isolation through consistent tenant filtering in all queries
- **Performance:** Single database with indexed tenant_id column for efficient queries
- **Maintainability:** Simple, consistent pattern across all resources
- **Scalability:** No architectural changes needed as tenant count grows
- **Development Experience:** Clear convention for all resource plugins to follow

## Consequences

### Positive

- Complete data isolation between tenants
- Single database instance reduces operational complexity
- Consistent implementation pattern across all resources
- Efficient querying with proper indexing
- Simple to implement and maintain

### Negative

- Risk of developer error if tenant filtering is accidentally omitted
- All queries must include tenant filtering logic
- Slightly increased query complexity compared to single-tenant design
- Cannot leverage database-native security features like PostgreSQL RLS

### Implementation Requirements

1. All resource models must include `tenantId` field
2. All API endpoints must filter by authenticated user's tenant ID
3. All database queries must include tenant filtering
4. Proper indexing on tenant_id columns for performance
5. Integration tests must verify tenant isolation

## Related ADRs

- [ADR 001: Initial System Architecture](001-initial-architecture.md) - Established plugin-based architecture
- [ADR 008: Database Naming Conventions](008-database-naming-conventions.md) - Defines naming patterns used for tenant_id fields