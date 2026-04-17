#!/bin/sh
set -e

# Run npm install to ensure node_modules is populated over the volume
npm install

# Boot next.js
exec npm run dev
