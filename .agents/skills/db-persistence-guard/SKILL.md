---
name: db-persistence-guard
description: >-
  Safeguard database integrity, persistent volumes, and non-destructive schema migrations. Use when creating database migrations, updating Eloquent models, or running any database commands.
---

# Database Persistence Guard Agent

This skill enforces strict database safety rules as mandated in `AGENTS.md`.

## CRITICAL: Single Source of Truth (SSOT) Protection

The Leadsy database holds real live production/staging operational records (±1,073 leads, team user profiles, audit logs, and WhatsApp conversation history) persisted in Persistent Volumes (PV/PVC).

## ABSOLUTELY FORBIDDEN COMMANDS

1. `php artisan migrate:fresh` (NEVER run in any environment)
2. `php artisan db:wipe` (NEVER run)
3. Direct `TRUNCATE TABLE` on operational tables
4. `docker compose down -v` (Flag `-v` deletes named volumes and destroys local database persistence)
5. Blind execution of `DatabaseSeeder` or `ProductionSeeder` that overwrites real admin credentials or clears tables

## Permitted Migration Patterns

- **Additive Changes Only**:
  - Add new columns (`$table->string('new_field')->nullable();`)
  - Add new indices or non-blocking foreign keys
  - Create new tables
- **Backward Compatibility**:
  - Never drop columns or rename existing operational columns without an explicit deprecation grace period.
  - Set default values or nullable for newly added columns to avoid breaking existing records.

## Migration Verification Checklist

Before running any migration:
1. Inspect the migration up and down methods:
   - Does `up()` drop tables or columns? **If yes: REJECT.**
   - Does `up()` modify column types destructively? **If yes: REJECT.**
2. Execute migration safely:
   ```bash
   php artisan migrate --force
   ```
3. Verify table schema persistence.
