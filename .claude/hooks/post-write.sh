#!/bin/bash
# Post-write hook - runs after file modifications to ensure code quality

set -euo pipefail

echo "🔧 Running post-write checks..."

# Run formatter check
echo "Checking code formatting..."
if ! yarn format; then
    echo "❌ Code formatting check failed. Run 'yarn format' to fix."
    exit 2
fi

# Run linter and exit with code 2 if it fails
echo "Running linter..."
if ! yarn lint:fix; then
    echo "❌ Linting failed"
    exit 2
fi

echo "✅ Post-write checks completed"
exit 0