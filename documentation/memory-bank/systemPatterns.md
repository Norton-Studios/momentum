# System Patterns

## 1. Monorepo with npm Workspaces

The entire project is housed in a single monorepo, with individual applications and plugins managed as distinct packages via npm workspaces. This approach centralizes dependency management and simplifies cross-package development and code sharing.

**Key Directories:**
-   `apps/`: Contains the core, long-running applications (e.g., `api`, `frontend`, `crons`).
-   `plugins/`: Contains modular, self-contained packages for `data-sources`, `resources`, and `reports`.
-   `documentation/`: Project-level documentation, including architectural decision records (ADRs).

## 2. Plugin-Based Architecture

The system is designed for extensibility through plugins. Core applications are built to dynamically discover and integrate functionality from the `plugins` directory at runtime.

-   **Dynamic Routing:** The API server (`apps/api`) automatically discovers and registers API endpoints defined within `plugins/resources/*/api/index.ts` and `plugins/reports/*/api/index.ts`.
-   **Dynamic Cron Jobs:** The cron scheduler (`apps/crons`) dynamically loads and schedules jobs defined within `plugins/data-sources/*/src/index.ts` and `plugins/reports/*/src/index.ts`.

This pattern allows new features to be added by simply creating a new plugin package, without modifying the core application code.

## 3. Multi-Tenant Data Isolation

The platform supports both multi-tenant (SaaS) and single-tenant (self-hosted) deployments.

-   **SaaS Model:** Each tenant's data is stored in a completely separate, isolated database. A central `main` database holds tenant metadata, including the connection string for their specific database. The API layer is responsible for identifying the tenant (e.g., via JWT) and dynamically switching to the correct database connection for each request.
-   **Self-Hosted Model:** A single database is used for the entire instance.

## 4. Centralized Data Orchestration

A dedicated cron process (`apps/crons`) is responsible for orchestrating the entire data collection and reporting lifecycle.

-   **Dependency Management:** It understands the dependencies between different data sources (e.g., repository data must be collected before commit data).
-   **Incremental Collection:** It manages collection windows to ensure data is fetched incrementally and idempotently, preventing duplication and minimizing load on external APIs.
