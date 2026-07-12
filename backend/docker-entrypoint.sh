#!/bin/sh
set -e

# Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
fi

# We run composer install here so it executes AFTER the volume is mounted,
# preventing the host directory from masking the vendor folder.
composer install --no-interaction --optimize-autoloader

# Ensure permissions are open for Laravel storage
chmod -R 777 storage bootstrap/cache 2>/dev/null || true

# Generate key if empty
if ! grep -q "APP_KEY=base64:" .env; then
  php artisan key:generate
fi

# Run migrations and seed
php artisan migrate --force
php artisan db:seed --force || true

# Boot the server or run custom command
if [ "$#" -gt 0 ]; then
  exec "$@"
else
  exec php artisan serve --host=0.0.0.0 --port=8000
fi
