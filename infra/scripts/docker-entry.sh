#!/bin/sh
# TISSAGE — Docker entrypoint helper
# Ce script est destiné à être exécuté dans le conteneur app
# pour attendre PostgreSQL avant de lancer le serveur

set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-tissage}"
DB_PASSWORD="${DB_PASSWORD:-tissage_dev_2026}"
DB_NAME="${DB_NAME:-tissage}"

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

exec "$@"
