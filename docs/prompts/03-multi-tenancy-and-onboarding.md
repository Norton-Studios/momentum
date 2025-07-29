# Phase 3: Multi-Tenancy & Onboarding

This phase implements the SaaS-specific features for managing different clients using single-database multi-tenancy.

**Task 3.1: Implement Tenant Authentication & Context** ✅
*   **Goal:** Allow the API to identify and isolate tenant data.
*   **Status:** Completed - Authentication middleware identifies tenants through user credentials and passes tenant context to all routes.

**Task 3.2: Create the Tenant Sign-up Flow** ✅
*   **Goal:** Build the tenant creation process.
*   **Status:** Completed - POST /tenant endpoint creates new tenants with admin users in shared database.
*   **Implementation:** Uses system admin token for security, generates secure passwords, creates tenant and admin user records.

**Task 3.3: Build the Onboarding UI (Teams & Repositories)**
*   **Goal:** Create the initial setup screen for new clients.
*   **Prompt for AI Agent:**
    > "After sign-up, direct users to an onboarding page. This page should allow them to define their teams and link their source code repositories (initially, just by entering repository names/URLs)."

**Task 3.4: Implement Repository-to-Team Mapping Logic**
*   **Goal:** Create the backend logic for assigning repositories to teams.
*   **Prompt for AI Agent:**
    > "Implement the mandatory `repositories` and `teams` resources. Create the Prisma schema for these tables in `resources/teams/db` and `resources/repositories/db`. In the API, create endpoints to manage these mappings. Implement two methods for assigning repositories to teams:
    > 1.  A regex matcher on the repository name.
    > 2.  A label/tag system."
