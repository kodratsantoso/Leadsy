#!/bin/sh
set -e

NODE_ENV="${NODE_ENV:-development}"
PORT="${PORT:-3000}"

if [ "$NODE_ENV" = "production" ]; then
  # Install once if node_modules is missing in a fresh container.
  if [ ! -d /app/node_modules ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
    npm ci --include=dev || npm install --include=dev
  fi

  # Build once per container lifecycle.
  if [ ! -f /app/.next/BUILD_ID ]; then
    npm run build
  fi

  exec npm run start -- --hostname 0.0.0.0 --port "$PORT"
fi

# Dev mode: clear stale artifacts and boot hot reload server.
rm -rf /app/.next 2>/dev/null || true
if [ ! -d /app/node_modules ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
  npm install
fi
exec npm run dev
