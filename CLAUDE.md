# Claude AI Development Guide

This guide contains specific instructions and context for Claude AI to work effectively on the Momentum project.

## Core Development Commands

```bash
# Install dependencies
yarn install

# Development
docker-compose up -d
yarn dev

# Database operations
yarn db:push
yarn db:migrate
yarn db:studio

# Start development server with hot reload
# App runs on http://localhost:3000

# Testing and linting
yarn lint
yarn lint:fix
yarn format
yarn test
yarn test:e2e
yarn typecheck
```

## Project Structure

### Repository Layout
```
momentum/
├── app/                          # React Router application code
│   ├── routes/                   # Routes
│   ├── components/               # Shared UI components
│   ├── styles/                   # Global CSS
│   ├── root.tsx                  # Root layout component
│   ├── routes.ts                 # Route configuration
│   ├── app.css                   # Global styles
│   └── db.server.ts              # Prisma client singleton
├── e2e/                          # Playwright E2E tests
│   ├── journeys/                 # E2E journey tests
│   │   └── example.spec.ts
│   └── playwright.config.ts      # Playwright configuration
├── prisma/                       # Database schema and migrations
│   └── schema.prisma             # Multi-schema Prisma definition
├── public/                       # Static assets
│   └── favicon.ico
└── docs/                         # Project documentation
    ├── OVERVIEW.md
    ├── TECHNICAL.md
    ├── PRODUCT.md
    ├── PIPELINES.md
    └── USER_JOURNEYS.md
```

### Database Schemas

`org`: Organization, tenant, user models
`data`: Data source integrations
`vcs`: Version control system models (repository, merge request)
`ci`: CI/CD pipeline models
`analysis`: Analysis and metrics
`project`: Project management models

## Rules

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Formatting**: Use Biome (`yarn format` before commits)
- **Linting**: Fix all Biome warnings (`yarn lint` or `yarn lint:fix`)
- **Module System**: Use ES modules exclusively - `"type": "module"` is set in package.json
- **Dependencies**: All dependencies are pinned to specific versions (e.g., `"react": "19.1.1"`)
- **Hooks**: If hooks report failures, Claude must investigate and resolve them immediately
- **No CommonJS**: Use `import`/`export`, never `require()`/`module.exports`
- **Pinned dependencies**: Specific versions only (`"express": "5.1.0"`) - except peer dependencies
- **Encapsulation**: Do not expose internal functions in order to test them

## Conventions

**Module Ordering**:
- consts outside the scope of a function should be at the top (e.g. `const COOKIE_NAME = "cookie_name";`)
- Exported functions should next
- Other functions should be ordered in the order they are used
- Interfaces and types should be at the bottom

**Domain driven folder structure**:
- Group by feature (e.g. `merge-request/`, `data-sources/`)
- Do not group by type (e.g. `models/`, `controllers/`, `services/`)
- Do not create generic folders (e.g. `utils/`, `helpers/`)

**Keep types with the code that uses them**:
- Do not create a types.ts file
- Types should be in the same file as the code that uses them

**Comments**:
- Use comments to explain why code exists, not what it does
- Keep comments minimal and reference documentation or specifications when possible

**Testing**:
- Colocate tests with the code they test (e.g. `merge-request.test.ts` next to `merge-request.ts`)
- Write e2e Playwright tests in `e2e/journeys/` 

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

### Error Handling Conventions

1. **Client-side errors**:
  - Use React Router error boundaries
  - Provide user-friendly messages
  - Log errors to monitoring service

2. **Server-side errors**:
  - Return proper HTTP status codes
  - Use Prisma error handling for database errors
  - Never expose internal errors to client

3. **Validation**:
  - Validate at route action/loader level
  - Return validation errors in standard format
  - Use Zod or similar for schema validation

## Principles

* **YAGNI**: You Aren't Gonna Need It - Don't add speculative functionality or features. Always take the simplest approach. 
* **Functional style** favour a simple functional approach. Don't use a class unless you have shared state
* **KISS**: Keep It Simple, Stupid - Avoid unnecessary complexity. Write code that is easy to understand and maintain.
* **Immutable**: Data should be immutable by default. Use const and avoid mutations to ensure predictable state.
* **Side Effects**: Functions should have no side effects. Avoid modifying external state or relying on mutable data.

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

## Communication Style

Be direct and straightforward. No cheerleading phrases like "that's absolutely right" or "great question." Tell the user when ideas are flawed, incomplete, or poorly thought through. Focus on practical problems and realistic solutions rather than being overly positive or encouraging.

Challenge assumptions, point out potential issues, and ask questions about implementation, scalability, and real-world viability. If something won't work, say so directly and explain why it has problems rather than just dismissing it.
