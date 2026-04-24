#!/bin/sh
set -e

# Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Ensure permissions are open for Laravel storage/cache writable paths
chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# Generate key if empty
if ! grep -q "APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

# Run migrations and seed
php artisan migrate --force
php artisan db:seed --force || true

# Boot the server
exec php artisan serve --host=0.0.0.0 --port=8000
