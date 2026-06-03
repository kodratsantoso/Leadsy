#!/usr/bin/env bash
# sync-db-local-to-vps.sh
#
# ONE-TIME manual script to dump the local PostgreSQL database and restore it
# on the VPS staging environment.
#
# WHEN TO USE:
#   - You want actual local records (leads, contacts, activities) on the VPS.
#   - This is a one-time migration, NOT part of normal CI/CD deployment.
#
# DO NOT run this automatically during deployment.
# For regular deploys, the entrypoint handles migrations + ProductionSeeder.
#
# REQUIREMENTS:
#   - pg_dump installed locally (comes with PostgreSQL client)
#   - SSH access to VPS
#   - psql available on VPS (inside the postgres container)
#
# USAGE:
#   chmod +x scripts/sync-db-local-to-vps.sh
#   VPS_HOST=your-vps-ip VPS_USER=root ./scripts/sync-db-local-to-vps.sh
#
set -euo pipefail

# ── Config — override via environment variables ───────────────────────────────
LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5435}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-leads}"
LOCAL_DB_USER="${LOCAL_DB_USER:-leads}"
LOCAL_DB_PASS="${LOCAL_DB_PASS:-leads}"

VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-root}"
VPS_SSH_PORT="${VPS_SSH_PORT:-22}"
VPS_PG_CONTAINER="${VPS_PG_CONTAINER:-leadsy-leads-pg}"
VPS_DB_NAME="${VPS_DB_NAME:-leads}"
VPS_DB_USER="${VPS_DB_USER:-leads}"

DUMP_FILE="/tmp/leadsy-local-dump-$(date +%Y%m%d-%H%M%S).sql"

# ── Validate ──────────────────────────────────────────────────────────────────
if [ -z "$VPS_HOST" ]; then
    echo "ERROR: VPS_HOST is required."
    echo "Usage: VPS_HOST=1.2.3.4 VPS_USER=root $0"
    exit 1
fi

echo "Detecting active PostgreSQL container name on VPS (${VPS_HOST})..."
DETECTED_CONTAINER=$(ssh -o ConnectTimeout=10 -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" "docker ps --filter 'name=postgres-aps4zkidae9b54ogoz8uc6z4' --format '{{.Names}}'" 2>/dev/null | head -n 1)

if [ -z "$DETECTED_CONTAINER" ]; then
    DETECTED_CONTAINER=$(ssh -o ConnectTimeout=10 -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" "docker ps --filter 'name=postgres-' --format '{{.Names}}'" 2>/dev/null | head -n 1)
fi

if [ -n "$DETECTED_CONTAINER" ]; then
    VPS_PG_CONTAINER="$DETECTED_CONTAINER"
    echo "      Found active container: $VPS_PG_CONTAINER"
else
    echo "      Warning: Could not detect active container on VPS. Falling back to default: $VPS_PG_CONTAINER"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Leadsy — Local → VPS Database Sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Source : ${LOCAL_DB_USER}@${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}"
echo "  Target : ${VPS_USER}@${VPS_HOST} → docker exec ${VPS_PG_CONTAINER}"
echo "  Dump   : ${DUMP_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -rp "This will OVERWRITE the VPS database. Continue? [y/N] " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

# ── Step 1: Dump local DB ─────────────────────────────────────────────────────
echo ""
echo "[1/4] Dumping local database to ${DUMP_FILE}..."
PGPASSWORD="$LOCAL_DB_PASS" pg_dump \
    -h "$LOCAL_DB_HOST" \
    -p "$LOCAL_DB_PORT" \
    -U "$LOCAL_DB_USER" \
    -d "$LOCAL_DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -f "$DUMP_FILE"
echo "      Dump complete: $(du -sh "$DUMP_FILE" | cut -f1)"

# ── Step 2: Copy dump to VPS ──────────────────────────────────────────────────
echo ""
echo "[2/4] Copying dump to VPS (${VPS_HOST})..."
scp -P "$VPS_SSH_PORT" "$DUMP_FILE" "${VPS_USER}@${VPS_HOST}:/tmp/leadsy-restore.sql"
echo "      Copy complete."

# ── Step 3: Restore on VPS ────────────────────────────────────────────────────
echo ""
echo "[3/4] Restoring on VPS (inside container ${VPS_PG_CONTAINER})..."
ssh -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" \
    "docker exec -i ${VPS_PG_CONTAINER} psql -U ${VPS_DB_USER} -d ${VPS_DB_NAME} < /tmp/leadsy-restore.sql"
echo "      Restore complete."

# ── Step 4: Cleanup ───────────────────────────────────────────────────────────
echo ""
echo "[4/4] Cleaning up temporary files..."
rm -f "$DUMP_FILE"
ssh -p "$VPS_SSH_PORT" "${VPS_USER}@${VPS_HOST}" "rm -f /tmp/leadsy-restore.sql"
echo "      Cleanup complete."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Sync complete. Verify the VPS app at https://leadsy.virtuenet.space"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
