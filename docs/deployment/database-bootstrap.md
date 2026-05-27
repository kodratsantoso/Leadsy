# Database Bootstrap Strategy

## Why Database Files Are Not Committed to GitHub

PostgreSQL data lives in Docker named volumes (`leadsy_pg_data`). These are:

- Binary files managed entirely by the Postgres engine
- Environment-specific (local paths, permissions, OIDs)
- Potentially hundreds of MB or larger
- Not designed to be version-controlled

Committing raw DB files would break every other environment and corrupt the repository. The correct approach is **migrations + seeders**, described below.

---

## Two-Layer Bootstrap

### Layer 1 — Structure: Migrations

All schema is declared in `backend/database/migrations/`. Laravel migrations create tables, columns, indexes, constraints, and relationships in the correct order. They are idempotent by design — already-applied migrations are skipped.

```bash
php artisan migrate --force
```

Migrations also seed a small amount of structural reference data (e.g. the default qualification parameter set), because that data is tightly coupled to the schema version.

### Layer 2 — Data: Seeders

Baseline records required for the application to function are seeded via Laravel seeders. All seeders use `firstOrCreate` or `updateOrCreate` — **they are safe to re-run on every deploy without creating duplicates**.

```bash
php artisan db:seed --class=ProductionSeeder --force
```

`ProductionSeeder` calls `DatabaseSeeder`, which seeds:

| Seeder method              | What it seeds                                               |
|---------------------------|-------------------------------------------------------------|
| `seedPermissions()`        | 14 RBAC permissions (leads, products, users, ai, etc.)      |
| `seedRoles()`              | 6 roles with permission assignments                         |
| `seedFunnelStages()`       | 11 pipeline stages (New Lead → Won / Lost / Nurture)        |
| `seedContactSources()`     | 7 contact source labels                                     |
| `seedSuperAdmin()`         | Default tenant + super_admin user                           |
| `seedIndustries()`         | 10 industries + 47 sub-industries                           |
| `seedAiProviders()`        | OpenAI, Anthropic, Google Gemini (inactive placeholders)    |
| `seedDiscoveryCategories()`| 14 Google Maps discovery categories                         |
| `seedNotificationPreferences()` | Default notification toggles in integration_configs   |

Products are intentionally not seeded. The product catalog is user-managed
database data, so deleted products must not reappear after `db:seed --force`.

---

## Snapshot Import for Fresh Deploys

For environments that must start with the current application records, this repository includes a database snapshot generated on 2026-05-27:

| File | Purpose |
|------|---------|
| `backend/database/snapshots/leadsy_full_structure_and_data_2026_05_27.sql` | Complete PostgreSQL structure + data archive for manual restore or audit. |
| `backend/database/snapshots/leadsy_deploy_data_2026_05_27.sql` | Public-schema application data used by the guarded Laravel import migration. |
| `backend/database/migrations/2026_05_25_000001_import_leadsy_database_snapshot.php` | Optional importer that runs during `php artisan migrate` only when enabled. |

Enable it only for the first deploy into an empty database:

```dotenv
IMPORT_LEADSY_DB_SNAPSHOT=true
```

The migration counts key business tables (`users`, `products`, `leads`, Lark tables, and activity tables) and refuses to import if records already exist. On an empty database it truncates the tables covered by the snapshot before importing, which avoids conflicts with baseline rows created by older migrations. `IMPORT_LEADSY_DB_SNAPSHOT_FORCE=true` exists for deliberate rebuilds, not routine production starts.

Snapshot data includes encrypted AI and Lark credentials. Those values can only be decrypted with the same Laravel `APP_KEY` used when the snapshot was created; otherwise re-enter the secrets in Settings after deploy.

---

## Entrypoint Flow

`backend/docker-entrypoint.production.sh` runs on every container start:

```
1. Copy .env.example → .env  (if no .env present)
2. Fix storage/cache permissions
3. Generate APP_KEY  (if not set)
4. php artisan optimize:clear
5. Wait for DB (retry loop, max 30 × 3s = 90s)
6. if AUTO_MIGRATE=true  → php artisan migrate --force
7. if AUTO_SEED_BASELINE=true → php artisan db:seed --class=ProductionSeeder --force
8. if SEED_DEMO_DATA=true → php artisan db:seed --class=DemoSeeder --force
9. exec php artisan serve --host=0.0.0.0 --port=8000
```

The DB wait loop uses a PHP PDO connection test — no external tools (nc, pg_isready) needed.

---

## Environment Variables

Add these to Coolify environment variables for the backend service:

| Variable             | Production | Staging/Dev | Description                                  |
|---------------------|-----------|------------|----------------------------------------------|
| `AUTO_MIGRATE`       | `true`    | `true`     | Run `migrate --force` on startup             |
| `AUTO_SEED_BASELINE` | `true`    | `true`     | Run `ProductionSeeder` on startup            |
| `SEED_DEMO_DATA`     | `false`   | optional   | Run `DemoSeeder` — NEVER true in production  |
| `IMPORT_LEADSY_DB_SNAPSHOT` | optional | optional | One-time fresh DB import from committed snapshot |
| `IMPORT_LEADSY_DB_SNAPSHOT_FORCE` | `false` | optional | Bypass existing-row guard for intentional rebuilds only |
| `DB_HOST`            | `postgres` | `postgres` | Postgres service name in Docker network      |
| `DB_PORT`            | `5432`    | `5432`     |                                              |
| `DB_DATABASE`        | `leads`   | `leads`    |                                              |
| `DB_USERNAME`        | `leads`   | `leads`    |                                              |
| `DB_PASSWORD`        | *(secret)*| *(secret)* | Set in Coolify secrets, never committed      |
| `APP_KEY`            | *(secret)*| *(secret)* | Generated once, then stored in Coolify       |

---

## Demo Data Strategy

Demo or sample lead data must **never** be automatically seeded in production.

- Add demo records to `backend/database/seeders/DemoSeeder.php`
- All entries must use `firstOrCreate` or `updateOrCreate`
- Enable only by setting `SEED_DEMO_DATA=true` in a staging environment

---

## Moving Local Data to VPS (One-Time Option)

If you need actual local database records (leads, activities, contacts) on the VPS staging environment:

### Option A — Promote to Seeder

Convert local records into `firstOrCreate` calls inside `DemoSeeder`. Commit and deploy. This is the preferred method for any data that should persist across rebuilds.

### Option B — Manual pg_dump / Restore

Use the provided script:

```bash
VPS_HOST=your-vps-ip VPS_USER=root ./scripts/sync-db-local-to-vps.sh
```

Script flow:
1. `pg_dump` from local Postgres (port 5435 by default)
2. `scp` dump to VPS `/tmp/`
3. `docker exec` restore into `leadsy-leads-pg` container
4. Cleanup temp files

**This is a one-time manual operation — do not automate or run on every deploy.**

Override defaults via env vars:

```bash
LOCAL_DB_HOST=localhost LOCAL_DB_PORT=5435 LOCAL_DB_NAME=leads \
VPS_HOST=1.2.3.4 VPS_USER=root \
./scripts/sync-db-local-to-vps.sh
```

---

## Coolify Deployment Checklist

- [ ] Backend service uses `Dockerfile.production` build context `./backend`
- [ ] Postgres service has persistent volume `leadsy_pg_data`
- [ ] All env vars from the table above are set in Coolify
- [ ] `APP_KEY` is set (run `php artisan key:generate --show` locally to get it)
- [ ] `DB_PASSWORD` is a Coolify secret — not in any committed file
- [ ] `SEED_DEMO_DATA` is absent or `false` in production
- [ ] After first deploy, verify at `/api/health` and check roles/stages exist

---

## Validation After Deploy

```bash
# Confirm tables exist
docker exec -it leadsy-leads-pg psql -U leads -c "\dt"

# Confirm baseline data seeded
docker exec -it leadsy-leads-pg psql -U leads -c "SELECT name FROM roles;"
docker exec -it leadsy-leads-pg psql -U leads -c "SELECT name FROM funnel_stages ORDER BY sequence;"
docker exec -it leadsy-leads-pg psql -U leads -c "SELECT slug FROM ai_providers;"
docker exec -it leadsy-leads-pg psql -U leads -c "SELECT email, role_id FROM users ORDER BY id;"
docker exec -it leadsy-leads-pg psql -U leads -c "SELECT app_id, enabled_modules FROM lark_integrations;"

# Confirm no demo leads (if SEED_DEMO_DATA=false)
docker exec -it leadsy-leads-backend php artisan tinker --execute="echo App\Models\Lead::count();"
```
