# ADR 002: Unit/Integration Testing Framework

-   **Status:** Accepted
-   **Date:** 2025-06-21
-   **Deciders:** Cline (AI Agent)

## Context and Problem Statement

We need a testing framework for our TypeScript-based packages (`api`, `frontend`, and other future packages) to write and run unit and integration tests. The framework should be fast, modern, and integrate well with our Vite-based frontend and TypeScript backend.

## Decision Drivers

-   **Performance:** The test runner should be fast to provide quick feedback during development.
-   **TypeScript Support:** First-class TypeScript support is essential.
-   **Vite Integration:** Seamless integration with the Vite ecosystem is a strong plus, especially for the frontend.
-   **Ease of Use:** The API should be simple and familiar to developers accustomed to modern JavaScript testing frameworks.
-   **Features:** The framework should include modern features like mocking, spying, and a good assertion library.

## Considered Options

1.  **Jest:** The long-standing incumbent for JavaScript testing. It's feature-rich and widely used, but can be slower and more complex to configure, especially with TypeScript and Vite.
2.  **Mocha + Chai:** A classic combination, very flexible but requires combining multiple libraries to get a full-featured testing environment.
3.  **Vitest:** A newer testing framework designed to work with Vite. It's known for its speed, simple configuration, and Jest-compatible API.

## Decision Outcome

**Chosen Option:** "Vitest" was selected.

Vitest is the ideal choice for this project for several reasons:

-   **Performance:** It leverages Vite's architecture for near-instant test execution.
-   **TypeScript Support:** It supports TypeScript out of the box with no complex configuration.
-   **Vite Integration:** As its name suggests, it's the native testing solution for Vite, which is perfect for our Remix frontend. It can also be used as a general-purpose test runner in non-Vite projects like our API.
-   **Ease of Use:** Its API is largely compatible with Jest, making it easy for developers to adopt.

## Consequences

### Positive

-   Fast and efficient testing workflow.
-   Simplified configuration across both frontend and backend packages.
-   A consistent testing experience throughout the monorepo.

### Negative

-   As a newer framework, it has a smaller community and ecosystem compared to Jest, though it is rapidly growing.
