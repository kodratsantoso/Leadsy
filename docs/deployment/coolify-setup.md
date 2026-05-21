# Coolify Deployment Setup — Leadsy

## Overview

Coolify deploys from GitHub using `docker-compose.production.yml`. On every push:

```
git push → GitHub → Coolify webhook → build images → start containers → entrypoint runs
```

The backend entrypoint (`docker-entrypoint.production.sh`) handles:
1. Wait for PostgreSQL to be ready
2. Run `php artisan migrate --force`
3. Run `php artisan db:seed --class=ProductionSeeder --force`
4. Cache config/routes/views
5. Start `php artisan serve`

All seeders use `updateOrCreate` / `firstOrCreate` — safe to run on every deploy.

---

## Step-by-Step Coolify Configuration

### 1. Create a New Resource in Coolify

- Type: **Docker Compose**
- Source: **GitHub** (connect your repo)
- Branch: `main`
- Docker Compose file: `docker-compose.production.yml`

### 2. Set Required Environment Variables

In Coolify → Resource → **Environment Variables**, add these. Mark secrets as **Secret**.

| Variable | Value | Secret |
|----------|-------|--------|
| `APP_KEY` | Output of `php artisan key:generate --show` — starts with `base64:` | ✅ Yes |
| `DB_PASSWORD` | Strong random password (e.g. `openssl rand -hex 32`) | ✅ Yes |
| `ADMIN_EMAIL` | Your admin login email | No |
| `ADMIN_PASSWORD` | Strong password for the seeded admin account | ✅ Yes |
| `AUTO_MIGRATE` | `true` | No |
| `AUTO_SEED_BASELINE` | `true` | No |
| `SEED_DEMO_DATA` | `false` | No |

> **How to generate APP_KEY without a running container:**
> ```bash
> docker run --rm php:8.2-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
> ```

### 3. Persistent Volumes

The following volumes are declared with explicit names in `docker-compose.production.yml`. They are **never deleted** between deploys:

| Volume name pattern | Contents | Delete? |
|---------------------|----------|---------|
| `{UUID}_leadsy-pg-data` | PostgreSQL database | **Never** |
| `{UUID}_leadsy-redis-data` | Redis AOF | Never |
| `{UUID}_backend-storage` | Laravel storage (uploads, logs) | Never |
| `{UUID}_whatsapp-auth-data` | WhatsApp Baileys session | Never |

The `{UUID}` is your Coolify resource UUID — Coolify passes it as `COOLIFY_RESOURCE_UUID`.

> ⚠️ **Do not delete these volumes** in the Coolify UI or via `docker volume rm`. Deleting `leadsy-pg-data` wipes the entire database.

### 4. Verify Volumes Exist After First Deploy

SSH into your VPS and run:
```bash
docker volume ls | grep leadsy
```

You should see 4 volumes. If the names don't contain a UUID (they use `rndleadsgenerator` as fallback), set `COOLIFY_RESOURCE_UUID` in your Coolify environment variables to a stable value (any non-empty string works, e.g. `leadsy-prod`).

### 5. First Deploy Checklist

- [ ] `APP_KEY` is set in Coolify as a Secret env var
- [ ] `DB_PASSWORD` is set (not `leads`)
- [ ] `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set
- [ ] `AUTO_MIGRATE=true`
- [ ] `AUTO_SEED_BASELINE=true`
- [ ] `SEED_DEMO_DATA=false`
- [ ] Deploy from Coolify dashboard
- [ ] Check backend logs: should end with `Starting Laravel server on 0.0.0.0:8000`
- [ ] Login at `https://leadsy.virtuenet.space` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`

### 6. Subsequent Deploys

On every `git push` to `main`, Coolify will:
1. Rebuild images (only backend/frontend layers that changed)
2. Replace containers
3. Entrypoint runs `migrate` + `ProductionSeeder` + `config:cache`
4. PostgreSQL volume is **never touched** — all user data persists

---

## Seeder Categories

| Seeder | When it runs | What it seeds |
|--------|-------------|---------------|
| `ProductionSeeder` | Every deploy (AUTO_SEED_BASELINE=true) | Permissions, roles, funnel stages, admin user, industries, AI providers, lead source types, notification defaults, discovery categories |
| `DemoSeeder` | Only when `SEED_DEMO_DATA=true` | Sample leads (staging/demo environments only) |
| `DevelopmentSeeder` | Local dev only (via DatabaseSeeder) | Calls ProductionSeeder + SampleLeadSeeder |

---

## Troubleshooting

### "data not seeded after deploy"
1. SSH into VPS: `docker logs leadsy-leads-backend --tail 100`
2. Look for `[entrypoint] Running ProductionSeeder...` and `ProductionSeeder complete.`
3. If missing, check `AUTO_SEED_BASELINE` env var in Coolify
4. If error before seeder: look for the failed command (optimize:clear, migrate, etc.)

### "sessions break after redeploy"
`APP_KEY` is being regenerated on each deploy. Set `APP_KEY` as a permanent Secret env var in Coolify.

### "database is empty after redeploy"
The PostgreSQL volume was recreated. Check volume names with `docker volume ls | grep leadsy`. If the UUID prefix changed, your old data is in a different volume. Run `docker volume ls | grep pg` to find it and rename if needed.

### "optimize:clear failed"
This is non-fatal — the entrypoint logs a warning and continues. Caches warm on first request.
