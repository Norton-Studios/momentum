# Claude AI Development Guide

This guide contains specific instructions and context for Claude AI to work effectively on the Momentum project.

## Project Overview

This is a modular, extensible web application for measuring developer productivity. It supports:
- Multi-tenant SaaS deployment
- Self-hosted deployment for individual organizations
- Plugin-based architecture for resources, data sources, and reports

## Core Development Commands

```bash
# Install dependencies
yarn install

# Start PostgreSQL database
docker-compose up -d

# Push Prisma schema to database (for development)
yarn db:push

# Run database migrations (for production)
yarn db:migrate

# Open Prisma Studio (database GUI)
yarn db:studio

# Start development server with hot reload
yarn dev
# App runs on http://localhost:3000

# Run linter
yarn lint

# Run linter with auto-fix
yarn lint:fix

# Format code
yarn format

# Check code formatting
yarn format:check

# Run unit/integration tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run E2E tests
yarn test:e2e

# Build for production
yarn build

# Start production server
yarn start

# Type check
yarn typecheck
```

## Project Structure and Conventions

### Repository Layout
```
momentum/
├── app/                      # React Router application code
│   ├── routes/              # Route components
│   │   ├── home.tsx         # Route handlers
│   │   └── home.test.tsx    # Co-located tests
│   ├── welcome/             # Feature modules
│   ├── root.tsx             # Root layout
│   ├── entry.server.tsx     # Server entry point
│   ├── entry.client.tsx     # Client entry point
│   ├── app.css              # Global styles
│   └── db.server.ts         # Prisma client singleton
├── e2e/                     # Playwright E2E tests
│   ├── journeys/            # E2E test files
│   │   └── example.spec.ts  # Journey test examples
│   └── playwright.config.ts # Playwright configuration
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Prisma schema definition
├── public/                  # Static assets
│   └── favicon.ico
├── docs/                    # Project documentation
│   ├── OVERVIEW.md
│   ├── TECHNICAL.md
│   ├── PRODUCT.md
│   ├── PIPELINES.md
│   └── USER_JOURNEYS.md
├── .env                     # Environment variables (not committed)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore patterns
├── biome.json               # Biome linter/formatter config
├── docker-compose.yml       # PostgreSQL database setup
├── package.json             # Dependencies and scripts
├── react-router.config.ts   # React Router configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler configuration
├── vitest.config.ts         # Vitest test configuration
└── CLAUDE.md                # This file
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

1. Database schema is defined in `prisma/schema.prisma`
2. Use `yarn db:push` for development to sync schema changes to the database
3. Use `yarn db:migrate` for production to create migration files
4. Prisma client is automatically generated when schema changes
5. Always follow snake_case naming for database tables and fields with Prisma @map annotations


## Testing Strategy

- **Unit/Integration Tests**: Use Vitest, co-locate with source files (`*.test.ts` or `*.test.tsx`)
- **E2E Tests**: Use Playwright in `e2e/` directory
- **Test Database**: Use Docker Compose PostgreSQL for isolated testing
- **Coverage**: Aim for high coverage on business logic and route handlers
- **Test Scripts**:
  - `yarn test` - Run unit/integration tests (non-interactive, for CI/CD)
  - `yarn test:watch` - Run tests in watch mode during development
  - `yarn test:e2e` - Run Playwright E2E tests

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Formatting**: Use Biome (`yarn format` before commits)
- **Linting**: Fix all Biome warnings (`yarn lint` or `yarn lint:fix`)
- **Code Quality**: SonarQube integration for static analysis
- **Module System**: Use ES modules exclusively - `"type": "module"` is set in package.json
- **Dependencies**: All dependencies are pinned to specific versions (e.g., `"react": "19.1.1"`)
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
- Clear separation of concerns through route-based architecture
- Extensive documentation and type definitions
- Comprehensive testing infrastructure (Vitest + Playwright)
- Test coverage helps validate AI-generated code
- Schema-first approach with Prisma provides clear data contracts
- Strict naming conventions for consistency
- Pre-commit hooks ensure code quality
