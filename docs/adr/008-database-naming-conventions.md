# ADR 008: Database Naming Conventions

- **Status:** Accepted
- **Date:** 2025-07-16
- **Deciders:** Development Team

## Context and Problem Statement

The Momentum application initially used inconsistent naming conventions across database tables and API endpoints. Some tables used plural names (e.g., `commits`, `repositories`) while others used singular names. API endpoints also lacked consistent patterns. This inconsistency made the codebase harder to maintain and created confusion for developers working on the system.

## Decision Drivers

- **Consistency:** Unified naming patterns across all database tables and API endpoints
- **Maintainability:** Predictable naming makes code easier to understand and modify
- **Developer Experience:** Clear conventions reduce cognitive load when working with the codebase
- **API Design:** RESTful patterns that follow industry standards
- **Database Performance:** Consistent naming enables better tooling and optimization

## Considered Options

1. **Plural Everything:** Use plural names for both database tables and API endpoints
2. **Singular Everything:** Use singular names for both database tables and API endpoints
3. **Mixed Approach:** Singular database tables with context-appropriate API endpoints
4. **Framework Default:** Follow Prisma's default plural table naming

## Decision Outcome

**Chosen Option:** "Mixed Approach" with singular database tables and context-appropriate API endpoints.

### Database Table Naming

- **Tables:** Singular snake_case names (e.g., `user`, `merge_request`, `created_at`)
- **Prisma Models:** Use `@@map("table_name")` to map PascalCase model names to snake_case tables
- **Fields:** Snake_case with `@map("field_name")` for camelCase aliases in TypeScript

```prisma
model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  firstName String   @map("first_name")
  
  @@map("user")
}
```

### API Endpoint Naming

- **Collections:** Plural nouns (e.g., `/users`, `/merge-requests`)
- **Creation:** Singular nouns (e.g., `POST /user`, `POST /merge-request`)
- **Individual Resources:** Singular nouns (e.g., `/user/:id`, `/merge-request/:id`)

### TypeScript Naming

- **Variables:** camelCase (e.g., `userId`, `createdAt`, `mergeRequest`)
- **Booleans:** Prefixed with `is`, `has`, or `can` (e.g., `isActive`, `hasPermission`)
- **Classes/Interfaces:** PascalCase (e.g., `UserService`, `MergeRequest`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

### File and Directory Naming

- **Files:** kebab-case (e.g., `user-service.ts`, `merge-request.model.ts`)
- **Directories:** kebab-case (e.g., `data-sources`, `merge-request`)

## Consequences

### Positive

- Consistent naming patterns across the entire codebase
- Clear distinction between database layer (snake_case) and application layer (camelCase)
- RESTful API design following industry standards
- Easier onboarding for new developers
- Better tooling support with predictable naming

### Negative

- Required migration of existing tables and endpoints
- Temporary disruption during transition period
- Need to update all existing documentation and tests
- Potential for confusion during mixed legacy/new naming period

### Migration Requirements

1. Updated all Prisma schemas to use singular table names with `@@map`
2. Updated all API endpoints to follow new naming conventions
3. Updated all TypeScript imports and references
4. Updated all tests to match new endpoint patterns
5. Updated documentation to reflect new conventions

## Implementation Examples

### Database Schema Migration
```prisma
// Before
model Commit {
  // fields
  @@map("commits")
}

// After
model Commit {
  // fields
  @@map("commit")
}
```

### API Endpoint Changes
```typescript
// Before
app.get('/commits', handler)
app.post('/commits', handler)
app.get('/commits/:id', handler)

// After
app.get('/commits', handler)      // Collection (plural)
app.post('/commit', handler)      // Creation (singular)
app.get('/commit/:id', handler)   // Individual (singular)
```

## Related ADRs

- [ADR 001: Initial System Architecture](001-initial-architecture.md) - Established plugin-based architecture
- [ADR 007: Multi-tenant Data Isolation](007-multi-tenant-data-isolation.md) - Uses these naming conventions for tenant_id fields