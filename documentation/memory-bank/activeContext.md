# Active Context

## Current Focus

The current focus is on implementing the first data source plugin to import repository data from GitHub. This involves setting up the necessary plugins, defining the data schema, and creating the data ingestion logic.

## Recent Changes

-   **Created GitHub Data Source Plugin:**
    -   Added a new plugin at `plugins/data-sources/github`.
    -   Implemented the data collection logic in `repository.ts` to fetch repositories from the GitHub API and upsert them into the database.
    -   Added unit tests for the data collection logic.
-   **Updated Repository Resource Plugin:**
    -   Extended the `Repository` schema in `plugins/resources/repository/db/schema.prisma` to include more fields from GitHub.
    -   Updated the API to use Express and added integration tests with Supertest.
-   **Updated Documentation:**
    -   Created a `README.md` for the new GitHub data source plugin.
    -   Updated `documentation/ARCHITECTURE.md` and `documentation/memory-bank/systemPatterns.md` to clarify the roles of resources and data sources, and to define the data source contract.

## Next Steps

1.  Implement User & Tenant Management to handle authentication and data isolation.
2.  Build out the frontend to display the collected repository data.
3.  Continue developing more data source and resource plugins.
