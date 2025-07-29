# ADR 004: Prisma Schema Synthesis

-   **Status:** Accepted
-   **Date:** 2025-06-28
-   **Deciders:** Cline (AI Agent)

## Context and Problem Statement

The project uses a modular, plugin-based architecture where each resource defines its own Prisma schema in a separate `schema.prisma` file. Prisma does not natively support importing or merging multiple schema files. We need a way to combine these distributed schemas into a single, valid schema that can be used to generate the Prisma client and run migrations.

## Decision Drivers

-   **Maintainability:** The solution should be easy to understand and maintain as the project grows.
-   **Robustness:** The solution should be able to handle the complexities of merging schemas, such as ensuring only one `datasource` and `generator` block exists in the final schema.
-   **Developer Experience:** The process of running migrations should be simple and straightforward for developers.
-   **Minimal Dependencies:** The solution should avoid adding unnecessary third-party dependencies to the project.

## Considered Options

1.  **Shell Script:** Use a simple shell script with commands like `cat` to concatenate the schema files. This is simple but not robust enough to handle the requirement of having only one `datasource` and `generator` block.
2.  **Third-Party Library:** Use a third-party library designed for this purpose. This would add an external dependency and may not offer the flexibility we need.
3.  **Custom TypeScript Script:** Write a custom script in TypeScript to intelligently merge the schemas. This provides full control over the merging logic and keeps the tooling consistent with the rest of the project's stack.

## Decision Outcome

**Chosen Option:** "Custom TypeScript Script" was selected.

This approach provides the best balance of the decision drivers:

-   **Maintainability:** The script is self-contained and easy to understand.
-   **Robustness:** The script can handle the specific requirements of our modular schema setup, ensuring a valid schema is always generated.
-   **Developer Experience:** The script is wrapped in a simple `npm` command (`npm run migrate --workspace=database`), making it easy to use.
-   **Minimal Dependencies:** The script only requires `tsx`, which is a common and lightweight dependency for TypeScript projects.

## Consequences

### Positive

-   We have full control over the schema merging logic.
-   The solution is robust and tailored to our specific needs.
-   The developer workflow for migrations is simple and consistent.

### Negative

-   We are responsible for maintaining the script.
