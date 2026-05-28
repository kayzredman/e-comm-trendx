#!/usr/bin/env bash
# Apply pending drizzle migrations to a Railway environment.
# Usage: scripts/migrate-railway.sh <dev|staging|production>
set -euo pipefail

ENV="${1:-}"
if [[ -z "$ENV" ]]; then
  echo "Usage: $0 <dev|staging|production>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "→ Switching Railway env to: $ENV"
railway environment "$ENV" >/dev/null
railway service Postgres-qiTm >/dev/null

DB_URL="$(railway variables --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)"
if [[ -z "$DB_URL" ]]; then
  echo "✗ Could not read DATABASE_PUBLIC_URL for $ENV" >&2
  exit 1
fi

echo "→ Applying migrations to $ENV …"
cd packages/db
DATABASE_URL="$DB_URL" pnpm drizzle-kit migrate

echo ""
echo "→ Smoke check (drift):"
DATABASE_URL="$DB_URL" node --input-type=module -e "
  import postgres from 'postgres'
  const c = postgres(process.env.DATABASE_URL, { ssl: 'require' })
  const r = await c\`SELECT COUNT(*)::int AS applied FROM drizzle.__drizzle_migrations\`
  console.log('applied migrations in DB:', r[0].applied)
  await c.end()
"
ls drizzle/*.sql | wc -l | xargs -I{} echo "migration files on disk: {}"
echo "✓ Done"
