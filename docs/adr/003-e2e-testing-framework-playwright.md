# ADR 003: End-to-End (E2E) Testing Framework

-   **Status:** Accepted
-   **Date:** 2025-06-21
-   **Deciders:** Cline (AI Agent)

## Context and Problem Statement

We need a robust framework for end-to-end (E2E) testing to simulate user interactions with our web application. This framework will be crucial for validating user flows, ensuring the frontend and backend are correctly integrated, and preventing regressions in the user interface.

## Decision Drivers

-   **Reliability:** The framework should produce stable and reliable test results, minimizing flaky tests.
-   **Cross-Browser Support:** The ability to test across modern browsers (Chromium, Firefox, WebKit) is essential.
-   **Developer Experience:** The framework should offer a good developer experience with features like a test runner UI, debugging tools, and clear error reporting.
-   **Performance:** E2E tests can be slow, so a framework with good performance is preferred.
-   **Features:** Rich features like auto-waits, network interception, and a web server to run the application are highly desirable.

## Considered Options

1.  **Cypress:** A popular E2E testing framework known for its all-in-one nature and developer-friendly features. However, it has historically had limitations with cross-origin testing and runs tests within the browser, which can be a different paradigm.
2.  **Selenium WebDriver:** The long-standing standard for browser automation. It's extremely powerful and supports a vast number of languages and browsers, but its API can be verbose and it often requires more complex setup.
3.  **Playwright:** A modern E2E testing framework developed by Microsoft. It is known for its speed, reliability, and rich feature set, including support for all major browser engines.

## Decision Outcome

**Chosen Option:** "Playwright" was selected.

Playwright is the best fit for our project due to its modern architecture and comprehensive feature set:

-   **Reliability:** Playwright's auto-waiting mechanism makes tests less flaky by default.
-   **Cross-Browser Support:** It provides first-class support for Chromium, Firefox, and WebKit.
-   **Developer Experience:** It comes with excellent tools like the Playwright Test runner, a UI mode for debugging, and Codegen to record tests.
-   **Features:** The built-in `webServer` option in its configuration is perfect for our monorepo setup, as it can automatically start our frontend development server before running the tests.

## Consequences

### Positive

-   A powerful and reliable E2E testing suite.
-   The ability to easily test complex user flows across multiple browsers.
-   Excellent tooling that will improve developer productivity when writing and debugging tests.

### Negative

-   E2E tests, regardless of the framework, can be slower and more resource-intensive than unit/integration tests.
-   Requires downloading browser binaries, which can increase setup time and disk space usage.
