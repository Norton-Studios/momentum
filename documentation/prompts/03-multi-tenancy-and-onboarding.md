# Phase 3: Multi-Tenancy & Onboarding

This phase implements the SaaS-specific features for managing different clients.

**Task 3.1: Implement Dynamic Database Connection Switching**
*   **Goal:** Allow the API to connect to different tenant databases on the fly.
*   **Prompt for AI Agent:**
    > "In the core API, create a middleware for Express. This middleware should identify the tenant (e.g., from a subdomain or JWT token) and use the `Tenant` table from the main database to get the correct database connection string. It should then create and cache a Prisma Client instance for that tenant's database, making it available on the request object for subsequent route handlers."

**Task 3.2: Create the Tenant Sign-up and Database Creation Flow**
*   **Goal:** Build the user-facing sign-up process that provisions a new database.
*   **Prompt for AI Agent:**
    > "Create a sign-up page in the Remix frontend and a corresponding API endpoint. When a new user signs up, the API should:
    > 1.  Create a new, dedicated PostgreSQL database for them.
    > 2.  Run all Prisma migrations from all `db` folders (`metrics/*/db`, `data-sources/*/db`, etc.) against the new database.
    > 3.  Save the new tenant's details, including the connection string, to the main `Tenant` table."

**Task 3.3: Build the Onboarding UI (Teams & Repositories)**
*   **Goal:** Create the initial setup screen for new clients.
*   **Prompt for AI Agent:**
    > "After sign-up, direct users to an onboarding page. This page should allow them to define their teams and link their source code repositories (initially, just by entering repository names/URLs)."

**Task 3.4: Implement Repository-to-Team Mapping Logic**
*   **Goal:** Create the backend logic for assigning repositories to teams.
*   **Prompt for AI Agent:**
    > "Implement the mandatory `repositories` and `teams` metrics. Create the Prisma schema for these tables in `metrics/teams/db` and `metrics/repositories/db`. In the API, create endpoints to manage these mappings. Implement two methods for assigning repositories to teams:
    > 1.  A regex matcher on the repository name.
    > 2.  A label/tag system."
