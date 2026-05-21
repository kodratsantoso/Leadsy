#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
DATE_STAMP="${BACKUP_DATE:-$(date +%F)}"
OUT_FILE="${BACKUP_FILE:-${BACKUP_DIR}/backup_leadsy_${DATE_STAMP}.sql}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_DATABASE="${DB_DATABASE:-leads}"
DB_USERNAME="${DB_USERNAME:-leads}"

EXCLUDED_TABLE_DATA=(
  "public.cache"
  "public.cache_locks"
  "public.failed_jobs"
  "public.job_batches"
  "public.jobs"
  "public.sessions"
  "public.password_reset_tokens"
  "public.personal_access_tokens"
  "public.email_verification_otps"
  "public.ai_connection_tests"
  "public.ai_requests"
  "public.integration_configs"
  "public.migrations"
)

mkdir -p "${BACKUP_DIR}"

exclude_args=()
for table in "${EXCLUDED_TABLE_DATA[@]}"; do
  exclude_args+=("--exclude-table-data=${table}")
done

{
  echo "-- LEADSY_DATA_ONLY_BACKUP"
  echo "-- Generated at: $(date -Iseconds)"
  echo "-- Source: local docker compose service ${DB_SERVICE}, database ${DB_DATABASE}"
  echo "-- Excludes runtime/security tables: ${EXCLUDED_TABLE_DATA[*]}"
  docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
    pg_dump \
      --username="${DB_USERNAME}" \
      --dbname="${DB_DATABASE}" \
      --data-only \
      --column-inserts \
      --on-conflict-do-nothing \
      --no-owner \
      --no-privileges \
      "${exclude_args[@]}"
} > "${OUT_FILE}"

echo "Created data-only backup: ${OUT_FILE}"
