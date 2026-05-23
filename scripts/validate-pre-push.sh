#!/usr/bin/env sh
set -eu

printf "\nRunning repository pre-push validation...\n"

sh scripts/validate-pre-commit.sh

printf "\n[frontend] Production build\n"
npm --prefix frontend run build

printf "\n[backend] Composer manifest validation\n"
cd backend
composer validate --strict --no-check-publish
cd ..

printf "\n[infrastructure] Production Docker Compose syntax check\n"
docker compose -f docker-compose.production.yml config >/dev/null

printf "\nPre-push validation passed.\n"
