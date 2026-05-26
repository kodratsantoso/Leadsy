# Leadsy Backend

Laravel API for Leadsy: authentication, RBAC, lead intelligence, maps, AI routing, WhatsApp bridge, and Lark integration.

## Local setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=ProductionSeeder
php artisan serve --host=0.0.0.0 --port=8000
```

The default Docker Compose stack exposes the API through `http://localhost:3001/api` and PostgreSQL on `localhost:5435`.

## Lark SSO and integration

Lark is managed from `Settings -> Integrations` in the active frontend.

Required backend environment values:

```dotenv
LARK_OPEN_API_BASE_URLS=https://open.larksuite.com/open-apis,https://open.larkoffice.com/open-apis
LARK_ACCOUNTS_BASE_URL=https://accounts.larksuite.com
LARK_OAUTH_SCOPES=auth:user.id:read
```

The backend follows the Lark Custom App OAuth flow:

- `GET /api/auth/lark/url` creates the authorization URL and stores OAuth `state` in cache.
- `/auth/lark/callback` on the frontend posts `code` and `state` to `POST /api/auth/lark/callback`.
- The backend exchanges the code at `/authen/v2/oauth/token`, fetches user info from `/authen/v1/user_info`, persists `lark_sso_users`, and returns a Sanctum token.
- Existing local users keep their configured role on SSO login; `sales_exec` is assigned only when a new SSO user is first created or an existing user has no role.
- Lark Base sync stores table configuration in `lark_base_tables` and record identity in `lark_base_record_mappings`. Operators map Leadsy Leads fields to Lark Base fields from Settings. Lead create/update queues Leadsy-to-Base pushes; Base webhook/manual pull uses the same mapping to update Leadsy without creating duplicate leads.

Lark app secrets are encrypted with Laravel's `APP_KEY`. If a database snapshot is restored into an environment with a different `APP_KEY`, re-save the Lark App Secret from Settings before testing the connection.

## Mobile sales visits

The Android/iOS mobile app uses the same Sanctum authentication flow as the web app. Field-sales visit evidence is stored in:

- `sales_visits` — lead/user visit session, clock-in/out timestamps, GPS coordinates, distance from lead, risk status, device metadata, visit result, notes, and client identity.
- `sales_visit_media` — photo evidence and client signature files linked to a visit.

Protected API endpoints:

- `GET /api/sales-visits`
- `POST /api/leads/{lead}/sales-visits/clock-in`
- `POST /api/sales-visits/{visit}/clock-out`
- `POST /api/sales-visits/{visit}/media`

The backend computes distance from the saved lead coordinates and flags basic location risk signals such as low GPS accuracy, outside-radius visits, mock location, rooted device, or jailbroken device. These checks are risk indicators and audit signals, not an absolute guarantee against spoofing.

## Database snapshot import

Migrations are the source of truth for schema. The repository also includes one deploy snapshot for carrying current records into a fresh database:

- `database/snapshots/leadsy_full_structure_and_data_2026_05_25.sql`
- `database/snapshots/leadsy_deploy_data_2026_05_25.sql`
- `database/migrations/2026_05_25_000001_import_leadsy_database_snapshot.php`

Enable the guarded import only for an empty target database:

```dotenv
IMPORT_LEADSY_DB_SNAPSHOT=true
```

The migration refuses to import if business rows already exist. On an empty database, it truncates the tables covered by the snapshot before importing so baseline rows from older migrations do not collide with snapshot IDs. `IMPORT_LEADSY_DB_SNAPSHOT_FORCE=true` bypasses the existing-row guard for intentional rebuilds, but it should not be used on a live database with records you need to preserve.

## Production bootstrap

`docker-entrypoint.production.sh` supports:

```dotenv
AUTO_MIGRATE=true
AUTO_SEED_BASELINE=true
SEED_DEMO_DATA=false
```

For a snapshot-based first deploy, run migrations with `IMPORT_LEADSY_DB_SNAPSHOT=true`, keep `AUTO_SEED_BASELINE=true` for idempotent baseline safety, and verify `/api/health` after startup.
