#!/bin/zsh
set -euo pipefail

cd /Users/phillipelliott/.openclaw/workspace/gary-dashboard

export PATH="/Users/phillipelliott/.nvm/versions/node/v22.13.1/bin:$PATH"
NPM="/Users/phillipelliott/.nvm/versions/node/v22.13.1/bin/npm"

# Ensure production build exists
if [ ! -d .next ]; then
  "$NPM" run build
fi

exec "$NPM" run start -- --hostname 127.0.0.1 --port 3000
