#!/bin/bash
# Pre-commit hook - runs linting, formatting, and tests before committing

set -euo pipefail

echo "🔍 Running pre-commit checks..."


# Run formatter check
echo "Checking code formatting..."
if ! yarn format; then
    echo "❌ Code formatting check failed. Run 'yarn format' to fix."
    exit 2
fi

# Run linter
echo "Running linter..."
if ! yarn lint:fix; then
    echo "❌ Linting failed"
    exit 2
fi

# Run tests
echo "Running tests..."
if ! yarn test; then
    echo "❌ Tests failed"
    exit 2
fi

# Run build to check for compilation errors
echo "Running build check..."
if ! yarn build; then
    echo "❌ Build failed"
    exit 2
fi

echo "✅ All pre-commit checks passed!"
exit 0