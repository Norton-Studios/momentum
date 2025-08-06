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

# Run individual services
yarn start:db      # Start PostgreSQL in Docker
yarn start:api     # Start API server on port 3001
yarn start:frontend # Start Remix frontend on port 3000

# Testing
yarn test          # Run all tests across workspaces
yarn test:ui       # Run tests with Vitest UI (in frontend)

# Code quality
yarn lint          # Run Biome linter
yarn format        # Format code with Biome
yarn test:coverage # Run tests with coverage report

# Database operations
yarn workspace @mmtm/database run synthesise  # Combine schema files
yarn workspace @mmtm/database run generate    # Generate Prisma client
yarn workspace @mmtm/database run migrate     # Run migrations
```

## Project Structure and Conventions

### Monorepo Layout
```
momentum/
├── apps/               # Core applications
│   ├── api/           # Express API server
│   ├── frontend/      # Remix application
│   ├── crons/         # Job scheduler
│   └── database/      # Prisma schema synthesis
├── libs/
│   ├── plugins/           # Extensible modules
│   │   ├── resources/     # Data models (e.g., team, repository)
│   │   ├── data-sources/  # External integrations (e.g., GitHub)
│   │   └── reports/       # Analytics and insights
├── docs/     # Project docs and ADRs
└── e2e-tests/        # Playwright E2E tests
```

### Plugin Architecture Rules

1. **Resources** (Data Models):
   - Must have `db/schema.prisma` for database schema
   - API endpoints in `api/index.ts` are auto-loaded by the API server
   - Define CRUD operations and business logic

2. **Data Sources** (Integrations):
   - Must export `resources: string[]` array indicating which resources they populate
   - Must export `run: async (db: PrismaClient) => void` function
   - Are discovered and scheduled by the crons application
   - Should be idempotent and handle incremental data collection

3. **Reports**:
   - Process data from resources to generate insights
   - Can expose API endpoints and scheduled jobs
   - Support multiple delivery methods (email, SFTP, etc.)

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

### Dynamic Loading Pattern

The core applications use dynamic imports to discover plugins:

```typescript
// Example from API server
const routes = await glob('../../plugins/*/*/api/index.ts')
routes.forEach(route => {
  const module = await import(route)
  // Register routes dynamically
})
```

## Database Schema Management

1. Each plugin defines its own schema in `db/schema.prisma`
2. The synthesise script combines all schemas into `apps/database/build/schema.prisma`
3. Prisma client is generated from the synthesized schema
4. Always run `yarn dev` or `generate` after schema changes

## Environment Setup

1. Copy `.env.example` files to `.env` in relevant directories
2. Required environment variables:
   - `DATABASE_URL` in `apps/database/.env`
   - `SONAR_TOKEN` and `SONAR_HOST_URL` for SonarQube integration (CI/CD only)

3. Default local database connection:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/dp-dev"
   ```

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
- **Imports**: Use workspace aliases (e.g., `@mmtm/database`)
- **Module System**: Use ES modules exclusively - add `"type": "module"` to all package.json files
- **Express Version**: All packages must use Express 5.x (`"express": "^5.1.0"` and `"@types/express": "^5.0.3"`)
- **Plugin Dependencies**: Resource and data source plugins should use Express as a peerDependency, not a direct dependency

## Development Workflow

1. **Adding a New Resource**:
   ```bash
   # Create plugin structure
   mkdir -p plugins/resources/my-resource/{api,db}
   
   # Create schema.prisma with your models
   # Create api/index.ts with Express routes
   # Run yarn dev to regenerate schemas
   ``` 

2. **Adding a Data Source**:
   ```bash
   # Create plugin
   mkdir -p plugins/data-sources/my-source
   
   # Export required constants
   export const resources = ['repository', 'commit']
   export const run = async (db) => { /* collection logic */ }
   ```

3. **Schema Changes**:
   - Modify the relevant `db/schema.prisma` file
   - Run `yarn workspace @mmtm/database run synthesise`
   - Run `yarn workspace @mmtm/database run generate`
   - Create and run migrations if needed

4. **Adding Tests to New Plugins**:
   - Always use `"test": "vitest run"` in package.json for non-interactive testing
   - Add `vitest.config.ts` that extends the root config
   - **Co-locate tests with the files they test** using `.test.ts` suffix (e.g., `api/index.test.ts` for `api/index.ts`)
   - Do NOT create separate `tests/` directories - tests should be next to the source files
   - Mock `@mmtm/database` import using `vi.mock()`
   - Test API endpoints using Supertest and Express

5. **Plugin Package.json Requirements**:
   - **MUST include** `"type": "module"` to use ES modules
   - Use Express as peerDependency: `"peerDependencies": { "express": "^5.1.0", "@types/express": "^5.0.3" }`
   - Include proper prisma schema path: `"prisma": { "schema": "db/schema.prisma" }`
   - Follow naming convention: `@mmtm/resource-{name}` or `@mmtm/data-source-{name}`

## Multi-Tenancy Considerations

- All tenants share a single database with data isolation via tenant_id
- Each request must identify the tenant through authenticated user context
- Tenant filtering should be applied to all queries in resource plugins
- Always include tenant_id in queries to ensure proper data isolation

## Common Pitfalls to Avoid

1. **Don't modify the synthesized schema** - Always edit plugin schemas
2. **Don't hardcode database connections** - Use environment variables
3. **Don't create circular dependencies** between plugins
4. **Don't forget to handle async operations** properly in data sources
5. **Don't skip schema synthesis** after adding/modifying plugins
6. **Don't add dependencies with ~ or ^** - Use exact versions
7. **Don't use CommonJS** - Always use ES modules with `import`/`export`, never `require()`/`module.exports`
8. **Don't forget `"type": "module"`** in package.json files - This is required for ES modules

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

## Debugging Tips

1. **API Issues**: Check dynamic route loading in `apps/api/src/lib/dynamicRoutes.ts`
2. **Schema Issues**: Verify synthesis output in `apps/database/build/schema.prisma`
3. **Cron Issues**: Check job discovery in `apps/crons/src/lib/dynamicJobs.ts`
4. **Database Issues**: Enable Prisma query logging with `DEBUG=prisma:query`

## AI-Centric Development Notes

This project is optimized for AI-assisted development:
- Clear separation of concerns through plugins
- Extensive documentation and type definitions
- Modular architecture allows focused changes
- Test coverage helps validate AI-generated code
- Schema-first approach provides clear data contracts

Remember: The plugin architecture means you can often add features without modifying core code. Always consider if a new feature should be a plugin rather than a core change.