#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${ROOT}/backend"

if [[ -f "${BACKEND}/artisan" ]]; then
  echo "Laravel already present at ${BACKEND}; remove or archive it before re-bootstrapping."
  exit 1
fi

mkdir -p "${BACKEND}"

if command -v composer >/dev/null 2>&1; then
  (cd "${BACKEND}" && composer create-project laravel/laravel . "^12.0")
elif command -v docker >/dev/null 2>&1; then
  docker run --rm -it \
    -v "${BACKEND}:/app" \
    -w /app \
    composer:2 \
    create-project laravel/laravel . "^12.0"
else
  echo "Install Composer or Docker to bootstrap Laravel. See backend/README.md"
  exit 1
fi

echo "Done. Configure ${BACKEND}/.env and run: php artisan migrate"
