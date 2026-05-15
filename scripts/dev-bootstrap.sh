#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  echo "→ Created .env from .env.example"
fi

echo "→ Starting Postgres / Redis / MinIO"
docker compose up -d postgres redis minio minio-init

echo "→ Installing dependencies"
pnpm install

echo "→ Building shared package"
pnpm --filter @utt/shared build

echo "→ Generating Prisma client"
pnpm --filter @utt/api db:generate

echo "→ Waiting for Postgres to accept connections"
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-utt}" -d "${POSTGRES_DB:-urban_tree_twin}" >/dev/null 2>&1; do
  sleep 1
done

echo "→ Running migrations"
pnpm --filter @utt/api db:migrate

echo "→ Applying PostGIS post-deploy SQL"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-utt}" -d "${POSTGRES_DB:-urban_tree_twin}" \
  < apps/api/prisma/post-deploy.sql

echo "→ Seeding demo data"
pnpm --filter @utt/api db:seed

echo "✓ Done. Run 'pnpm dev' to start the stack."
