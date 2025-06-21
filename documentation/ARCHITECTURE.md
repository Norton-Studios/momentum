# System Architecture

This project uses a monorepo architecture managed with npm workspaces. The structure is designed to be modular and scalable, supporting a plugin-based approach for metrics, data sources, and reports.

## High-Level Diagram

```mermaid
graph TD
    subgraph Monorepo
        direction LR
        A[documentation]
        B(frontend)
        C(api)
        D(crons)
        E(reports)
        F(metrics)
        G(data-sources)
        H(e2e-tests)
    end

    subgraph "Plugin-based Modules"
        direction TB
        G --> G1[data-sources/github]
        G --> G2[data-sources/jenkins]
        F --> F1[metrics/pipelines]
        F --> F2[metrics/repositories]
        E --> E1[reports/weekly-summary]
    end

    subgraph "Core Systems"
        B -- "Loads Components" --> F
        B -- "Loads Components" --> E
        C -- "Loads Routes" --> F
        C -- "Loads Routes" --> E
        C -- "Loads Routes" --> G
        D -- "Loads Jobs" --> G
        D -- "Loads Jobs" --> E
    end

    subgraph "Data Flow"
        U[User] -- "Interacts" --> B
        B -- "Calls API" --> C
        C -- "Manages" --> DB[(Postgres DB)]
        D -- "Triggers" --> G
        G -- "Collects Data" --> DB
        D -- "Triggers" --> E
        E -- "Generates Reports" --> DB
        E -- "Sends Reports" --> Notif[Email/SFTP]
    end

    C -- "Handles Auth & Tenant Logic" --> U
```

## Core Concepts

-   **Monorepo:** All code is contained in a single repository, managed as distinct packages using npm workspaces. This simplifies dependency management and cross-package development.
-   **Plugin Architecture:** `metrics`, `data-sources`, and `reports` are not just folders but collections of self-contained packages. The core systems (`api`, `frontend`, `crons`) are designed to dynamically discover and integrate these packages. For example, the API server will automatically load any route definitions found in `metrics/*/api`.
-   **Multi-Tenancy:** For the SaaS version, each client (tenant) has their own isolated database. A central `main` database stores tenant metadata, including connection details, allowing the API to switch database connections dynamically based on the authenticated user.
-   **Data Orchestration:** A core cron job acts as an orchestrator, managing the data collection lifecycle. It uses a dependency graph to ensure data sources are polled in the correct order and tracks collection windows to gather data incrementally.
