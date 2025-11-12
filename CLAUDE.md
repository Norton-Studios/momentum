# Claude AI Development Guide

This guide contains specific instructions and context for Claude AI to work effectively on the Momentum project.

## Project Overview

This is a modular, extensible web application for measuring developer productivity. It supports:
- Multi-tenant SaaS deployment
- Self-hosted deployment for individual organizations
- Plugin-based architecture for resources, data sources, and reports

## Core Development Commands

```bash
# Install dependencies (run from root)
yarn install

# Start development environment (database + API + frontend)
yarn dev
# TODO: update
```

## Project Structure and Conventions

### Monorepo Layout
```
# TODO: update
```

### Naming Conventions

Follow these strict naming conventions throughout the project:

1. **Database Tables and Fields**:
   - Must be singular and snake_case: `user`, `merge_request`, `created_at`
   - Use Prisma `@@map` for table names and `@map` for field names to provide camelCase aliases
   - Example:
     ```prisma
     model User {
       id        String   @id @default(cuid())
       createdAt DateTime @default(now()) @map("created_at")
       firstName String   @map("first_name")
       
       @@map("user")
     }
     ```

2. **TypeScript Variables**:
   - Use camelCase: `userId`, `createdAt`, `mergeRequest`
   - Boolean variables should be prefixed with `is`, `has`, or `can`: `isActive`, `hasPermission`

3. **Classes and Interfaces**:
   - Use PascalCase: `UserService`, `MergeRequest`, `ApiResponse`
   - Interfaces should be descriptive without `I` prefix: `UserRepository`, `DatabaseConnection`

4. **Constants**:
   - Use SCREAMING_SNAKE_CASE: `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`

5. **File and Directory Names**:
   - Use kebab-case for files: `user-service.ts`, `merge-request.model.ts`
   - Use kebab-case for directories: `data-sources`, `merge-request`

6. **API Endpoints**:
   - Use kebab-case with plural nouns: `/users`, `/merge-requests`
   - Use singular for specific resources: `/user/:id`, `/merge-request/:id`
   - Use singular for resource creation, e.g., `POST /user` to create a new user

## Database Schema Management

1. Each plugin defines its own schema in `db/schema.prisma`
2. The synthesise script combines all schemas into `apps/database/build/schema.prisma`
3. Prisma client is generated from the synthesized schema
4. Always run `yarn dev` or `generate` after schema changes


## Testing Strategy

- **Unit/Integration Tests**: Use Vitest, co-locate with source files (`*.test.ts`)
- **E2E Tests**: Use Playwright in `e2e-tests/`
- **Test Database**: Use transactions or test containers for isolation
- **Coverage**: Aim for high coverage on business logic and API endpoints
- **Test Scripts**: All packages must use `"test": "vitest run"` for non-interactive testing (required for CI/CD)

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Formatting**: Use Biome (`yarn format` before commits)
- **Linting**: Fix all Biome warnings (`yarn lint`)
- **Code Quality**: SonarQube integration with Turbo for efficient change-based analysis
- **Module System**: Use ES modules exclusively - add `"type": "module"` to all package.json files
- **Dependencies**: All packages must be pinned to specific versions (e.g. `"express": "5.1.0"`)
- **MANDATORY**: If hooks report failures, Claude must investigate and resolve them immediately

## Performance Considerations

- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use incremental data collection in data sources
- Consider caching for expensive computations
- Monitor query performance with Prisma logging

## Security Best Practices

- Validate all user inputs
- Use parameterized queries (Prisma handles this)
- Implement proper authentication/authorization
- Store sensitive data encrypted
- Follow OWASP guidelines for web security

## AI-Centric Development Notes

This project is optimized for AI-assisted development:
- Clear separation of concerns through plugins
- Extensive documentation and type definitions
- Modular architecture allows focused changes
- Test coverage helps validate AI-generated code
- Schema-first approach provides clear data contracts
