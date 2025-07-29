# Phase 4: Data Collection Engine

This phase focuses on building the system that gathers data from external sources.

**Task 4.1: Design and Implement Data Source Dependency Tracking**
*   **Goal:** Create the database schema to manage data collection.
*   **Prompt for AI Agent:**
    > "In a new package `packages/db-core`, define a Prisma schema for a `DataSource` table. This table should include:
    > - `name`: A unique name for the data source (e.g., 'github-repositories').
    > - `last_collection_start_ts`: Timestamp of the last run.
    > - `last_data_collected_until_ts`: The end of the last successful collection window.
    > - `dependencies`: A JSON or text array field to list the names of other `DataSource`s that must run before this one."

**Task 4.2: Implement the Data Collection Orchestrator**
*   **Goal:** A script that runs data collection jobs in the correct order.
*   **Prompt for AI Agent:**
    > "In the `crons` package, create an orchestrator job. This job should:
    > 1.  Read all `DataSource` entries from the database.
    > 2.  Build a dependency graph (DAG) from the `dependencies` field.
    > 3.  Execute the data collection crons in the correct topological order.
    > 4.  Pass the `last_data_collected_until_ts` as the start of the collection window for the current run.
    > 5.  Update the timestamps upon successful completion of each job."

**Task 4.3: Implement a Data Source (e.g., GitHub Repositories)**
*   **Goal:** Create the first real data source plugin.
*   **Prompt for AI Agent:**
    > "Create a new data source at `data-sources/github-repositories`.
    > - `db/`: Define a Prisma schema for a `Repository` table.
    > - `cron/`: Create a cron job that uses the GitHub API to fetch repositories. It should use the collection window provided by the orchestrator and perform an `upsert` operation into the `Repository` table to ensure idempotency."
