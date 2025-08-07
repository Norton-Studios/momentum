#!/bin/bash

# Unified pre-tool hook that routes to specific handlers based on the command
# This script receives the command that Claude is about to run and decides
# which specialized hook to call

set -e

# Get the command that Claude is about to run
COMMAND="$CLAUDE_FLOW_COMMAND"

# Check if this is a git commit command
if [[ "$COMMAND" =~ ^git\ commit ]]; then
    exec "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-commit.sh"
fi

# Check if this is a PR creation command
if [[ "$COMMAND" =~ ^gh\ pr\ create ]]; then
    exec "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-pr.sh"
fi

