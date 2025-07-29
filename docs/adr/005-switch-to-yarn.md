# 005-switch-to-yarn

## Status

Accepted

## Context

Initially, `npm` was chosen as the package manager for this monorepo. However, as the project grows and the number of packages increases, `npm` workspaces have shown some limitations, particularly around performance, deterministic installs, and advanced features for monorepo management.

Yarn, specifically Yarn Berry (v2+), offers a more robust solution for monorepos with features like Plug'n'Play (PnP) for faster and more reliable installs, improved workspace management, and better caching. The `.yarnrc.yml` file already exists in the root, indicating a prior intention or partial setup for Yarn.

## Decision

We will switch from `npm` to `yarn` (specifically Yarn Berry) as the primary package manager for this monorepo. This decision is based on the following advantages:

-   **Performance:** Yarn PnP significantly reduces `node_modules` size and improves installation times.
-   **Determinism:** PnP ensures that dependencies are resolved consistently across all environments.
-   **Workspace Management:** Yarn's workspace features are well-suited for complex monorepos.
-   **Caching:** Efficient caching mechanisms further speed up development workflows.

## Consequences

-   All developers will need to ensure they have Yarn installed and are using the correct version (Yarn Berry).
-   Existing `package-lock.json` files will be removed, and `yarn.lock` will become the source of truth for dependency versions.
-   Build and CI/CD pipelines will need to be updated to use `yarn` commands instead of `npm` commands.
-   The `techContext.md` documentation will be updated to reflect this change.
