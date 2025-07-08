# System Architecture

This project uses a monorepo architecture managed with npm workspaces. The structure is designed to be modular and scalable, supporting a plugin-based approach for metrics, data sources, and reports.

## High-Level Diagram

```mermaid
graph TD
    subgraph Monorepo
        direction LR
        subgraph "apps"
            B(frontend)
            C(api)
            D(crons)
            I(database)
        end
        subgraph "plugins"
            E(reports)
            F(resources)
            G(data-sources)
        end
        A[documentation]
        H(e2e-tests)
    end

    subgraph "Plugin-based Modules"
        direction TB
        G --> G1[data-sources/github]
        G --> G2[data-sources/jenkins]
        F --> F1[resources/pipelines]
        F --> F2[resources/repositories]
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
-   **Plugin Architecture:** The `plugins` directory contains collections of self-contained packages for `resources`, `data-sources`, and `reports`.
    -   **Resources:** Define the core data models of the platform (e.g., `Team`, `Repository`). They are responsible for the database schema (via a local `db/schema.prisma`) and exposing CRUD API endpoints.
    -   **Data Sources:** Responsible for collecting data from external systems (e.g., GitHub, Jira) and ingesting it into the appropriate resource schemas. They are managed by the `crons` application.
    -   **Reports:** Process the data from resources to generate insights and analytics.
-   The core systems (`api`, `frontend`, `crons`) in the `apps` directory are designed to dynamically discover and integrate these packages. For example, the API server will automatically load any route definitions found in `plugins/resources/*/api`.
-   **Multi-Tenancy:** For the SaaS version, each client (tenant) has their own isolated database. A central `main` database stores tenant metadata, including connection details, allowing the API to switch database connections dynamically based on the authenticated user.
-   **Data Orchestration:** A core cron job acts as an orchestrator, managing the data collection lifecycle. It uses a dependency graph to ensure data sources are polled in the correct order and tracks collection windows to gather data incrementally.

## Data Model

The following diagram illustrates the core entities of the system and their relationships. Each entity will be implemented as a separate resource plugin.

```mermaid
erDiagram
    team {
        int id PK
        string name
    }
    developer {
        int id PK
        string name
        string email
    }
    repository {
        int id PK
        string name
        string url
    }
    environment {
        int id PK
        string name
    }
    commit {
        string sha PK
        int repository_id FK
        int developer_id FK
        datetime timestamp
    }
    merge_request {
        int id PK
        int repository_id FK
        int author_id FK
        string title
    }
    pull_request_review {
        int id PK
        int merge_request_id FK
        int reviewer_id FK
        string state
    }
    build {
        int id PK
        string commit_sha FK
        string status
    }
    build_stage {
        int id PK
        int build_id FK
        string name
        string status
    }
    deployment {
        int id PK
        int build_id FK
        int environment_id FK
        datetime timestamp
    }
    project {
        int id PK
        string name
        string key
    }
    issue {
        int id PK
        int project_id FK
        int assignee_id FK
        string title
    }
    issue_status {
        int id PK
        string name
    }
    board {
        int id PK
        int project_id FK
        string name
    }
    board_column {
        int id PK
        int board_id FK
        string name
    }
    quality_scan {
        int id PK
        int repository_id FK
        datetime timestamp
    }
    quality_metric {
        int id PK
        int quality_scan_id FK
        string name
        float value
    }

    team ||--o{ developer : "has"
    team_repository {
        int team_id PK, FK
        int repository_id PK, FK
    }
    team }o--o{ repository : "manages"
    repository ||--o{ commit : "contains"
    repository ||--o{ merge_request : "has"
    developer ||--o{ commit : "authors"
    developer ||--o{ merge_request : "authors"
    merge_request ||--o{ pull_request_review : "has"
    developer ||--o{ pull_request_review : "performs"
    commit ||--o{ build : "triggers"
    build ||--o{ build_stage : "has"
    build ||--o{ deployment : "results in"
    deployment }o--|| environment : "targets"
    project ||--o{ issue : "contains"
    project ||--o{ board : "has"
    board ||--o{ board_column : "has"
    issue }o--|| issue_status : "has"
    developer ||--o{ issue : "assigned to"
    repository ||--o{ quality_scan : "undergoes"
    quality_scan ||--o{ quality_metric : "produces"
```
