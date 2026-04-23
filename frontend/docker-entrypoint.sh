#!/bin/sh
set -e

# Clear stale Next.js artifacts on the bind-mounted workspace.
# Without this, Docker dev boot can reuse a partially written `.next`
# directory and serve recurring 500s with missing manifest/chunk errors.
rm -rf /app/.next

# Run npm install to ensure node_modules is populated over the volume
npm install

# Boot next.js
exec npm run dev
