#!/bin/sh
# Production entrypoint for leadsy-backend container.
# Runs on every container start: wait-for-db → migrate → seed → serve.
#
# Environment variables (set in Coolify dashboard or docker-compose.production.yml):
#   APP_KEY             Required. Generate with: php artisan key:generate --show
#   AUTO_MIGRATE        true|false  (default: true)
#   AUTO_SEED_BASELINE  true|false  (default: true)
#   SEED_DEMO_DATA      true|false  (default: false — NEVER set true in production)
#   ADMIN_EMAIL         (default: admin@prasetia.com)
#   ADMIN_PASSWORD      (default: ChangeMe!123 — override in Coolify!)

set -e

log() {
    echo "[entrypoint] $*"
}

set_env_value() {
    key="$1"
    value="$2"

    if grep -q "^${key}=" .env 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${value}|" .env
    else
        echo "${key}=${value}" >> .env
    fi
}

read_env_value() {
    key="$1"
    sed -n "s/^${key}=//p" .env 2>/dev/null | tail -n 1
}

# ── 1. Bootstrap .env ─────────────────────────────────────────────────────────
if [ ! -f .env ]; then
    log "No .env found — copying .env.example as base"
    cp .env.example .env
fi

# ── 2. Storage permissions ────────────────────────────────────────────────────
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# ── 3. App key ────────────────────────────────────────────────────────────────
# Only generate if APP_KEY is not already injected via Docker environment.
# Priority: Docker env var > .env file > generate new.
if [ -n "${APP_KEY:-}" ]; then
    log "APP_KEY provided via environment."
    set_env_value "APP_KEY" "${APP_KEY}"
else
    if grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
        APP_KEY="$(read_env_value APP_KEY)"
        export APP_KEY
        log "APP_KEY loaded from .env."
    else
        log "APP_KEY not set — generating. Set APP_KEY in Coolify to make it permanent."
        php artisan key:generate --force
        APP_KEY="$(read_env_value APP_KEY)"
        export APP_KEY
    fi
fi

# Coolify can pass empty strings for optional secrets. Normalize service
# defaults before Artisan reads the process environment, otherwise empty Docker
# env values override the safe defaults in .env.
DB_PASSWORD="${DB_PASSWORD:-leads}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@prasetia.com}"
REDIS_CLIENT="${REDIS_CLIENT:-predis}"

export DB_PASSWORD ADMIN_EMAIL REDIS_CLIENT
set_env_value "DB_PASSWORD" "${DB_PASSWORD}"
set_env_value "ADMIN_EMAIL" "${ADMIN_EMAIL}"
set_env_value "REDIS_CLIENT" "${REDIS_CLIENT}"

if [ -n "${ADMIN_PASSWORD:-}" ]; then
    export ADMIN_PASSWORD
    set_env_value "ADMIN_PASSWORD" "${ADMIN_PASSWORD}"
fi

# ── 4. Wait for database ──────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-leads}"
DB_USERNAME="${DB_USERNAME:-leads}"

MAX_RETRIES=30
RETRY_COUNT=0

log "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until php -r "
try {
    new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');
    exit(0);
} catch (Exception \$e) {
    exit(1);
}
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
        log "ERROR: Database not reachable after ${MAX_RETRIES} attempts. Aborting."
        exit 1
    fi
    log "  Not ready — attempt ${RETRY_COUNT}/${MAX_RETRIES}, retrying in 3s..."
    sleep 3
done
log "Database is ready."

# ── 5. Migrations ─────────────────────────────────────────────────────────────
AUTO_MIGRATE="${AUTO_MIGRATE:-true}"
if [ "$AUTO_MIGRATE" = "true" ]; then
    log "Running migrations..."
    php artisan migrate --force
    log "Migrations complete."
fi

# ── 6. Clear caches (non-fatal — cache may not be warm yet on first boot) ─────
log "Clearing Laravel caches..."
php artisan optimize:clear || {
    log "WARNING: optimize:clear failed (non-fatal). Cache will warm on first request."
}

# ── 7. Production seeder ──────────────────────────────────────────────────────
# Runs roles, permissions, funnel stages, admin user, industries, AI providers,
# lead source types, notification defaults, and discovery categories.
# All seeders use updateOrCreate — safe to run on every deploy.
AUTO_SEED_BASELINE="${AUTO_SEED_BASELINE:-true}"
if [ "$AUTO_SEED_BASELINE" = "true" ]; then
    log "Running ProductionSeeder..."
    php artisan db:seed --class=ProductionSeeder --force
    log "ProductionSeeder complete."
else
    log "AUTO_SEED_BASELINE=false — skipping ProductionSeeder."
fi

# ── 8. Demo/staging seeder (explicitly opt-in, never default true) ────────────
SEED_DEMO_DATA="${SEED_DEMO_DATA:-false}"
if [ "$SEED_DEMO_DATA" = "true" ]; then
    log "SEED_DEMO_DATA=true — running DemoSeeder (staging/dev only)."
    php artisan db:seed --class=DemoSeeder --force
    log "DemoSeeder complete."
fi

# ── 9. Optimise for production ────────────────────────────────────────────────
log "Running config:cache and route:cache..."
php artisan config:cache  || log "WARNING: config:cache failed (non-fatal)."
php artisan route:cache   || log "WARNING: route:cache failed (non-fatal)."
php artisan view:cache    || log "WARNING: view:cache failed (non-fatal)."

# ── 10. Start server ──────────────────────────────────────────────────────────
log "Starting Laravel server on 0.0.0.0:8000..."
exec php artisan serve --host=0.0.0.0 --port=8000
