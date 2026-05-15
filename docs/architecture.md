# Architecture

## Domain model

The system is multi-tenant. Every business entity carries a `tenantId` and every
query (raw SQL or Prisma) filters on it. Tenants get their own slug-routable
identity, plan tier, users, zones, species library, and asset graph.

```
Tenant 1 ─┬─ N User
          ├─ N Species
          ├─ N Zone           (geometry: Polygon, 4326)
          ├─ N Tree           (geometry: Point,   4326) ─┬─ N Inspection ─ N TreeImage
          │                                              ├─ N RiskAssessment
          │                                              └─ N PruneTask
          ├─ N Crew
          └─ N AuditEvent
```

Spatial columns are managed by Prisma's `Unsupported("geometry(...,4326)")` and
backed by PostGIS extensions installed at container init. GIST indexes are added
out-of-band via `apps/api/prisma/post-deploy.sql`.

## Request flow

```
Browser ──► Next.js (RSC + client components) ──► Fastify (v1)
                                                    │
                                                    ├── Zod parse
                                                    ├── JWT verify (RS-free HS256)
                                                    ├── requireRole guard
                                                    ├── service layer
                                                    │     └── Prisma + raw SQL (PostGIS)
                                                    ├── BullMQ enqueue (scoring/risk)
                                                    └── audit log
```

## Async pipelines

- **Image scoring**: `POST /v1/images/uploads` returns a presigned PUT URL. Once
  the client uploads to S3, it calls `POST /v1/images/:id/finalize` which
  enqueues a `utt:scoring` job. The worker calls the external inference
  service (or a deterministic mock when `INFERENCE_URL` is unset), stores per-image
  scores, and re-aggregates the parent tree's `healthScore` / `healthClass`
  from the trailing 6-month window.
- **Risk batch**: `POST /v1/risk/batch` fan-outs `utt:risk` jobs. The worker
  reuses the same scoring rules as the synchronous endpoint, so dashboards stay
  consistent.

## Risk model (v1)

`apps/api/src/services/risk.service.ts` exposes a transparent rule-based scorer:

| Factor              | Weight | Signal                                                    |
| ------------------- | ------ | --------------------------------------------------------- |
| `health_deficit`    | 0.30   | `(100 - latest healthScore) / 100`                        |
| `species_proneness` | 0.15   | `species.failureProneness`                                |
| `defects`           | 0.25   | cavity, cracks, fungal fruiting, root damage, lean, deadwood |
| `sail_area`         | 0.15   | `min(1, canopyRadius² × height / 600)`                   |
| `wind_load`         | 0.15   | `sigmoid((gust - 30) / 8)`                                |

The composed score blends 70% structural risk with 30% consequence (size proxy).
Factor contributions are returned to the UI so operators can see *why* a tree is
flagged — this is a regulatory and procurement requirement for public-sector
buyers.

The model version is pinned (`rule-v1.0.0`) and recorded on every
`risk_assessments` row, so a learned successor (XGBoost / GBM trained on
historical post-storm failures) can be A/B-rolled out per-tenant.

## Multi-tenancy

- Tenancy is enforced at the **service layer**, not by row-level security
  alone, because Prisma migrations would otherwise lose visibility of policies.
- All `WHERE` clauses include `"tenantId" = $1`.
- `tenants.slug` is unique → public URLs can route by slug if a future
  white-label deployment needs it.

## Observability

- Structured JSON logs via Pino; pretty-printed in dev.
- Request id propagates through `req.id` and shows up in error responses.
- `audit_events` table keyed by `(tenantId, entity, entityId, createdAt)` for
  compliance review.
- Health probes split into `/healthz` (liveness) and `/readyz` (DB + Redis).

## Scaling notes

- The Fastify app is stateless — horizontal scaling behind a load balancer.
- BullMQ workers scale independently per queue.
- PostGIS GIST + `(tenantId, geom)` composite GIST keeps bbox queries fast.
- Images live in S3-compatible storage; CDN can front the read path with
  short-lived signed URLs.
