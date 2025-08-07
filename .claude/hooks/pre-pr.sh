#!/bin/bash
# Pre-PR hook - runs comprehensive checks before creating pull request

set -euo pipefail

echo "🚀 Running pre-PR checks..."


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

# Run all tests including coverage
echo "Running full test suite with coverage..."
if ! yarn test:coverage; then
    echo "❌ Tests failed"
    exit 2
fi

# Run build to ensure everything compiles
echo "Running build..."
if ! yarn build; then
    echo "❌ Build failed"
    exit 2
fi

# Check for any uncommitted changes
if ! git diff --quiet; then
    echo "❌ You have uncommitted changes. Please commit or stash them before creating a PR."
    exit 2
fi

# Check if current branch is ahead of master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "master" ]; then
    echo "❌ Cannot create PR from master branch"
    exit 2
fi

echo "✅ All pre-PR checks passed! Ready to create pull request."
exit 0