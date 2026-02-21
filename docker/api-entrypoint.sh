#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  DB_HOSTPORT=$(echo "$DATABASE_URL" | awk -F@ '{print $2}' | cut -d/ -f1)
  DB_HOST=$(echo "$DB_HOSTPORT" | cut -d: -f1)
  DB_PORT=$(echo "$DB_HOSTPORT" | cut -d: -f2)
  if [ -z "$DB_PORT" ] || [ "$DB_PORT" = "$DB_HOST" ]; then
    DB_PORT=5432
  fi

  echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
  for i in $(seq 1 30); do
    if nc -z "$DB_HOST" "$DB_PORT"; then
      echo "Database is up."
      break
    fi
    echo "Database not ready yet (${i}/30)."
    sleep 2
  done

  echo "Generating Prisma client..."
  cd /app/apps/api
  npx prisma generate

  echo "Running Prisma db push..."
  npx prisma db push --skip-generate

  if [ "${SEED_DATA}" != "false" ]; then
    echo "Seeding database..."
    npm run prisma:seed
  fi
fi

exec "$@"
