# Urban Tree Twin

Digital-twin SaaS for urban-tree operators in Vietnam — built after Typhoon Yagi (2024)
toppled ~25,000 trees in Hanoi exposed how blind most municipalities are about
their own greening assets.

> **One sentence:** GIS inventory + image-based health scoring + storm-aware
> failure-risk forecasting + pruning schedule, multi-tenant, API-first.

Target buyers: provincial public-utility tree companies, industrial-park
management boards, large private campuses (BĐS / KCN / FDI factories), and
research institutes that need an auditable record of every tree they own.

---

## Capability map

| Pillar               | What it does                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **GIS twin**         | Per-tree record with PostGIS `Point(4326)`, zones (`Polygon`), bbox/zone/species filtering, GeoJSON.  |
| **Health scoring**   | Mobile/drone images → object-storage (S3/MinIO) → async ML scoring → tree-level rolling aggregate.    |
| **Risk forecasting** | Transparent rule model (species × defects × sail area × wind scenario) producing a 0–100 risk score.  |
| **Pruning schedule** | Tasks, crews, priority, auto-generation from HIGH/EXTREME risk trees, status transitions.             |
| **Multi-tenant**     | Every entity is tenant-scoped; JWT access + rotating refresh tokens; role matrix (Owner→Viewer).      |
| **Observability**    | `/healthz` + `/readyz`, request-id propagation, audit log (`audit_events`), Pino structured logs.     |

---

## Architecture

```
┌────────────────┐   HTTPS/JSON    ┌──────────────────────┐
│  Next.js (web) │ ──────────────► │  Fastify API (v1)    │
│  MapLibre GL   │                 │  Zod + Prisma        │
│  React Query   │                 │                      │
└────────────────┘                 │  ┌────────────────┐  │
                                   │  │ PostGIS 16/3.4 │  │
                                   │  └────────────────┘  │
                                   │  ┌────────────────┐  │
                                   │  │ Redis (BullMQ) │  │
                                   │  └────────────────┘  │
                                   │  ┌────────────────┐  │
                                   │  │ S3 / MinIO     │  │
                                   │  └────────────────┘  │
                                   └──────────┬───────────┘
                                              │
                                  ┌───────────┴────────────┐
                                  │  BullMQ workers        │
                                  │  - scoring.worker      │ → optional inference gateway
                                  │  - risk.worker         │
                                  └────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the full diagram and data model.

---

## Repo layout

```
apps/
  api/        Fastify + Prisma + PostGIS, JWT auth, BullMQ queues + workers
  web/        Next.js 15 (App Router) + MapLibre GL + React Query + Tailwind
packages/
  shared/     Zod schemas + domain types shared by web and api
docker/
  postgres/   init SQL (extensions)
docs/
  architecture.md, deployment.md, security.md
.github/
  workflows/ci.yml, dependabot.yml
docker-compose.yml
```

---

## Local development

### Prerequisites

- Node.js ≥ 20.10 (`.nvmrc` matches)
- pnpm ≥ 9
- Docker (for PostGIS, Redis, MinIO)

### 1. Bring up infra

```bash
cp .env.example .env
pnpm db:up                 # docker compose up postgres redis minio
```

### 2. Install + migrate + seed

```bash
pnpm install
pnpm --filter @utt/shared build
pnpm --filter @utt/api db:generate
pnpm --filter @utt/api db:migrate
psql "$DATABASE_URL" -f apps/api/prisma/post-deploy.sql
pnpm --filter @utt/api db:seed
```

### 3. Run

```bash
pnpm dev
```

- API:  http://localhost:4000 (Swagger UI at `/docs`)
- Web:  http://localhost:3000
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)

Demo login (from seed): `admin@demo.local` / `admin-demo-pass-1234`

Run the workers in separate terminals when exercising the async pipelines:

```bash
pnpm --filter @utt/api worker:scoring
pnpm --filter @utt/api worker:risk
```

---

## Deployment

Container images are built from `apps/api/Dockerfile` and `apps/web/Dockerfile`. The
CI workflow (`.github/workflows/ci.yml`) lints, types, tests, runs migrations against
a real PostGIS service, and builds both images on every push to `main`.

For production checklists (TLS, JWT rotation, S3 lifecycle, backups, observability),
see [docs/deployment.md](docs/deployment.md).

---

## Security model

- Argon2id password hashing with server-side pepper.
- Rotating refresh tokens (sha256-hashed at rest), tenant-isolated.
- All write routes guarded by `requireRole`; role matrix in [docs/security.md](docs/security.md).
- Audit log of every write (`audit_events`) keyed by `(tenantId, actorId)`.
- Helmet + CORS allowlist + rate-limit (excluding probes).
- S3 uploads use short-TTL presigned PUT URLs; clients never see access keys.

---

## License

Apache-2.0 — see [LICENSE](LICENSE).
