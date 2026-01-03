#!/usr/bin/env bash
set -e

# Load nvm
export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Use project-specified Node version (or LTS)
nvm install
nvm use
corepack enable

npx playwright install --with-deps
npm install -g @anthropic-ai/claude-code

# Configure bash history for unlimited size
echo "Configuring bash history..."
cat >> /home/vscode/.bashrc << 'EOF'

# Unlimited bash history with timestamps (matches host format)
HISTSIZE=-1
HISTFILESIZE=-1
HISTTIMEFORMAT="%F %T "
shopt -s histappend
EOF
echo "✅ Bash history configured"

echo "✅ Dev container setup complete."
