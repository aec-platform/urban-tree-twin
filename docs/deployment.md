# Deployment

## Targets

The reference deployment is a single Kubernetes namespace per environment with
three workloads:

1. `utt-api` (Fastify) — `Deployment` + `Service` + `HPA`. Probes:
   `/healthz` (liveness), `/readyz` (readiness).
2. `utt-web` (Next.js) — `Deployment` + `Service`. Liveness on `/`.
3. `utt-workers` (BullMQ) — separate `Deployment`s for `worker:scoring` and
   `worker:risk`, no service.

Supporting:

- **PostgreSQL + PostGIS** — managed (AWS RDS / Aiven / Supavisor) or
  self-hosted; ensure the `postgis`, `postgis_topology`, `pgcrypto`, `pg_trgm`,
  and `btree_gist` extensions exist (see `docker/postgres/init/01-extensions.sql`).
- **Redis** — managed (Elasticache / Upstash) or self-hosted.
- **S3-compatible object storage** — AWS S3, Cloudflare R2, MinIO. Configure a
  lifecycle rule to expire orphan uploads (no `finalize` call) after 24 h.

## Required env

See `.env.example`. Production must override at minimum:

- `JWT_SECRET` ≥ 32 random bytes (`openssl rand -base64 48`)
- `PASSWORD_PEPPER` ≥ 16 random bytes — losing this invalidates all hashes
- `DATABASE_URL`, `REDIS_URL`, S3 credentials
- `CORS_ORIGINS` whitelist of your web origins

## Release flow

1. CI builds `utt-api:<sha>` and `utt-web:<sha>` images.
2. Migration job: `pnpm --filter @utt/api db:migrate:deploy` followed by
   `psql ... -f apps/api/prisma/post-deploy.sql`.
3. Rollout API → Web → Workers.
4. Post-deploy smoke: `GET /readyz`, `POST /v1/auth/login` with a synthetic
   tenant, then `GET /v1/risk/summary`.

## Backups

- Daily logical PostgreSQL dump (`pg_dump --format=c`) retained 30 days.
- Object-storage bucket: enable versioning + cross-region replication for
  inspection imagery used as legal evidence after a storm.
- BullMQ state is recoverable; don't back up Redis beyond ops snapshots.

## Disaster recovery

- RPO target: 1 h (PITR).
- RTO target: 2 h (provision new cluster, restore base + WAL, redeploy
  containers, run post-deploy SQL).
- Quarterly DR drill restores the previous-week dump into a staging cluster
  and runs the full integration test suite.

## Operational runbook

- **Spike in risk-batch failures**: check the inference gateway; rate-limit on
  external weather API; verify Redis memory headroom (`maxmemory-policy`
  should be `noeviction`).
- **Slow bbox queries**: confirm `trees_geom_gix` exists; run
  `EXPLAIN ANALYZE` against an offending query and verify the tenant bbox
  predicate is sargable.
- **Auth lockout**: revoke all refresh tokens for a tenant:
  ```sql
  UPDATE refresh_tokens SET "revokedAt" = NOW()
  WHERE "userId" IN (SELECT id FROM users WHERE "tenantId" = $1);
  ```
