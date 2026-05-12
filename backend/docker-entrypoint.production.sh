#!/bin/sh
set -e

# ── Copy env template if no .env present ──────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
fi

# ── Permissions ───────────────────────────────────────────────────────────────
chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# ── Generate app key if missing ───────────────────────────────────────────────
if ! grep -q "APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

# ── Wait for database ─────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-leads}"
DB_USERNAME="${DB_USERNAME:-leads}"
DB_PASSWORD="${DB_PASSWORD:-leads}"

MAX_RETRIES=30
RETRY_COUNT=0

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until php -r "
try {
    \$pdo = new PDO(
        'pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}',
        '${DB_USERNAME}',
        '${DB_PASSWORD}'
    );
    exit(0);
} catch (Exception \$e) {
    exit(1);
}
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        echo "ERROR: Database not reachable after ${MAX_RETRIES} attempts. Aborting."
        exit 1
    fi
    echo "  Database not ready — attempt ${RETRY_COUNT}/${MAX_RETRIES}, retrying in 3s..."
    sleep 3
done
echo "Database is ready."

# ── Migrations (must run before optimize:clear when CACHE_STORE=database) ────
AUTO_MIGRATE="${AUTO_MIGRATE:-true}"
if [ "$AUTO_MIGRATE" = "true" ]; then
    echo "Running migrations..."
    php artisan migrate --force
    echo "Migrations complete."
fi

# ── Clear Laravel caches after schema exists (avoids flush on missing tables) ─
php artisan optimize:clear

# ── Baseline seed (roles, stages, AI providers, etc.) ─────────────────────────
AUTO_SEED_BASELINE="${AUTO_SEED_BASELINE:-true}"
if [ "$AUTO_SEED_BASELINE" = "true" ]; then
    echo "Running ProductionSeeder..."
    php artisan db:seed --class=ProductionSeeder --force
    echo "Baseline seed complete."
fi

# ── Demo seed (sample leads — staging/dev only) ───────────────────────────────
SEED_DEMO_DATA="${SEED_DEMO_DATA:-false}"
if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "Running DemoSeeder (SEED_DEMO_DATA=true)..."
    php artisan db:seed --class=DemoSeeder --force
    echo "Demo seed complete."
fi

# ── Start application ─────────────────────────────────────────────────────────
echo "Starting Laravel server..."
exec php artisan serve --host=0.0.0.0 --port=8000
