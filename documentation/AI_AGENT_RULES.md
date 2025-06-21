# AI Agent Rules & Instructions

This document outlines the rules and guidelines for any AI agent contributing to this project. Adherence to these rules is critical for maintaining code quality, consistency, and project velocity.

1.  **Adhere to the Architecture:** All new features must follow the established plugin-based architecture. Place files in their correct locations within the monorepo. Do not introduce new top-level directories or architectural patterns without first updating the `ARCHITECTURE.md` document and getting approval.

2.  **Idempotency is Key:** All data collection and processing scripts must be idempotent. This means running a script multiple times with the same inputs should produce the same result without creating duplicate data or causing errors. Use `upsert` (update or insert) database logic wherever applicable.

3.  **Document Your Work:** For any new metric, data source, or report, you must add a `README.md` file within its directory. This file should explain what the module does, its data schema (if any), and any environment variables it requires to run.

4.  **Write Tests:** Any new API endpoint or critical business logic must be accompanied by unit or integration tests. Any new user-facing feature or change to an existing one requires a corresponding end-to-end (E2E) test using Playwright.

5.  **Run Tests Before Committing:** Before concluding your work, you must always run the full suite of local checks to ensure your changes have not introduced any regressions. This includes:
    *   `npm run format`
    *   `npm run lint`
    *   (Once available) `npm test`

6.  **Update Dependencies:** When adding a new data source that depends on another (e.g., collecting pipeline data requires repository data), ensure the `dependencies` field in the `DataSource` table is correctly populated in the seed or migration script.

7.  **Keep Schemas Self-Contained:** Each module (`metric`, `data-source`, `report`) that requires a database table must define its own `schema.prisma` file within a `db` sub-folder. Do not add tables for a specific module to a core or shared schema file. The database creation process will automatically combine these schemas.

8.  **Secure by Default:** Treat all configuration and secrets (API keys, database connection strings) as sensitive information. They must be loaded from environment variables. Never hardcode secrets into the source code. Every package that requires environment variables should include an `.env.example` file documenting the required variables.
