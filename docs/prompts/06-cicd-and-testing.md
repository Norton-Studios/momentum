# Phase 6: CI/CD and Testing

This phase ensures the project is robust and maintainable.

**Task 6.1: Setup End-to-End Tests**
*   **Goal:** Create a suite of tests to validate key user flows.
*   **Prompt for AI Agent:**
    > "In the `e2e-tests` directory, set up Playwright. Write initial tests for the sign-up flow, the onboarding process, and viewing a report. Ensure the tests can run against a local development environment."

**Task 6.2: Create a CI/CD Pipeline**
*   **Goal:** Automate testing and deployment.
*   **Prompt for AI Agent:**
    > "Create a GitHub Actions workflow file (`.github/workflows/ci.yml`). This workflow should be triggered on every push to the `main` branch. It should:
    > 1.  Install dependencies for all workspaces.
    > 2.  Run Biome to check for linting and formatting issues.
    > 3.  Build all packages (`api`, `frontend`, etc.).
    > 4.  Run the Playwright E2E tests."
