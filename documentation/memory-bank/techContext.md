# Technical Context

## Core Technologies

-   **Language:** TypeScript is used across the entire monorepo for type safety and modern language features.
-   **Monorepo Management:** npm Workspaces are used to manage the multiple packages within the project.
-   **Backend Framework:** The API is built with Hono, a lightweight and fast web framework for Node.js.
-   **Frontend Framework:** The frontend is a Remix application.
-   **Database:** PostgreSQL is the primary database.
-   **ORM:** Prisma is used as the Object-Relational Mapper for database access, providing type-safe queries and schema management.

## Development & Tooling

-   **Package Manager:** `yarn` (specifically Yarn Berry) is the package manager for the project.
-   **Code Formatting & Linting:** Biome is used for code formatting and linting to ensure a consistent and high-quality codebase. The command `npm run format` should be run before committing code.
-   **Testing:**
    -   Unit and integration tests are written with Vitest.
    -   End-to-end (E2E) tests are written with Playwright.
-   **Environment Variables:** All sensitive information, such as API keys and database URLs, must be loaded from environment variables. Each package requiring environment variables includes an `.env.example` file to document what is needed.

## Database Schema Management

-   **Modular Schemas:** Each plugin that requires database tables defines its own `schema.prisma` file within a `db/` subdirectory.
-   **Schema Synthesis:** A custom script (`apps/database/synthesise.ts`) is used to combine these modular schemas into a single, unified `schema.prisma` file in the `apps/database/build` directory. This synthesized schema is then used by Prisma to generate the database client and run migrations. This approach keeps the data model for each plugin self-contained.
