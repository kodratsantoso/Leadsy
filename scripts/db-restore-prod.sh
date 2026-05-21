#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_DATABASE="${DB_DATABASE:-leads}"
DB_USERNAME="${DB_USERNAME:-leads}"
BACKUP_DIR="${ROOT_DIR}/backups"
MODE="replace"
YES="false"
DUMP_FILE=""

usage() {
  cat <<'EOF'
Usage:
  scripts/db-restore-prod.sh <backup.sql> [--mode=replace|merge] [--yes]

Modes:
  replace  Backup production DB, truncate application data tables, then import dump.
  merge    Backup production DB, then import dump with ON CONFLICT DO NOTHING.

Environment overrides:
  COMPOSE_FILE=docker-compose.production.yml
  DB_SERVICE=postgres
  DB_DATABASE=leads
  DB_USERNAME=leads
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode=*)
      MODE="${1#*=}"
      shift
      ;;
    --yes|-y)
      YES="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${DUMP_FILE}" ]]; then
        DUMP_FILE="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
done

if [[ -z "${DUMP_FILE}" ]]; then
  echo "Missing backup.sql file." >&2
  usage
  exit 1
fi

if [[ ! -f "${DUMP_FILE}" ]]; then
  echo "Backup file not found: ${DUMP_FILE}" >&2
  exit 1
fi

if [[ "${MODE}" != "replace" && "${MODE}" != "merge" ]]; then
  echo "Invalid mode: ${MODE}. Use replace or merge." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

PRE_RESTORE_BACKUP="${BACKUP_DIR}/prod_pre_restore_$(date +%Y-%m-%d_%H%M%S).dump"

echo "Production compose file : ${COMPOSE_FILE}"
echo "Production DB service   : ${DB_SERVICE}"
echo "Production database     : ${DB_DATABASE}"
echo "Production DB user      : ${DB_USERNAME}"
echo "Incoming dump           : ${DUMP_FILE}"
echo "Restore mode            : ${MODE}"
echo "Pre-restore backup      : ${PRE_RESTORE_BACKUP}"

if [[ "${YES}" != "true" ]]; then
  echo
  read -r -p "This will modify PRODUCTION database '${DB_DATABASE}'. Continue? Type RESTORE to proceed: " answer
  if [[ "${answer}" != "RESTORE" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "Creating production backup before restore..."
docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  pg_dump \
    --username="${DB_USERNAME}" \
    --dbname="${DB_DATABASE}" \
    --format=custom \
    --no-owner \
    --no-privileges \
  > "${PRE_RESTORE_BACKUP}"

if [[ ! -s "${PRE_RESTORE_BACKUP}" ]]; then
  echo "Pre-restore backup is empty. Aborting restore." >&2
  exit 1
fi

if [[ "${MODE}" == "replace" ]]; then
  echo "Truncating application data tables before import..."
  docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
    psql --username="${DB_USERNAME}" --dbname="${DB_DATABASE}" --set=ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT IN (
      'migrations',
      'cache',
      'cache_locks',
      'failed_jobs',
      'job_batches',
      'jobs',
      'sessions',
      'password_reset_tokens',
      'personal_access_tokens',
      'email_verification_otps',
      'ai_connection_tests',
      'ai_requests',
      'integration_configs'
    );

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;
SQL
fi

echo "Importing data dump..."
{
  echo "SET session_replication_role = replica;"
  cat "${DUMP_FILE}"
  echo "SET session_replication_role = DEFAULT;"
} | docker compose -f "${COMPOSE_FILE}" exec -T "${DB_SERVICE}" \
  psql --username="${DB_USERNAME}" --dbname="${DB_DATABASE}" --set=ON_ERROR_STOP=1

echo "Restore completed."
echo "Production backup kept at: ${PRE_RESTORE_BACKUP}"
