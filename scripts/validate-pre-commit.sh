#!/usr/bin/env sh
set -eu

printf "\nRunning repository pre-commit validation...\n"

printf "\n[frontend] TypeScript type check\n"
cd frontend
./node_modules/.bin/tsc --noEmit
cd ..

printf "\n[backend] Laravel Pint formatting check\n"
cd backend
./vendor/bin/pint --test

printf "\n[backend] PHP syntax check\n"
find app bootstrap config database routes tests -name '*.php' -print0 \
  | xargs -0 -n 1 php -l >/dev/null
cd ..

printf "\n[infrastructure] Docker Compose syntax check\n"
docker compose config >/dev/null

printf "\n[whatsapp-service] Node syntax check\n"
node --check whatsapp-service/index.js

printf "\nPre-commit validation passed.\n"
