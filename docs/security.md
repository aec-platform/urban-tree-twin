# Security

## Identity

- **Hashing**: argon2id with a server-side pepper from `PASSWORD_PEPPER`.
  Memory/cost defaults from `argon2` are used; tune via env if benchmarks
  call for it.
- **Sessions**: short-lived JWT access tokens (default 15 min), rotating
  refresh tokens stored as `sha256` hashes. Logout / rotate revokes by
  setting `revokedAt`.
- **JWT claims** are limited to `{ userId, tenantId, email, role }`.

## Authorization

| Role        | Read trees / inspections | Create trees | Manage tasks | Manage users | Tenant settings |
| ----------- | :----------------------: | :----------: | :----------: | :----------: | :-------------: |
| OWNER       | ✓                        | ✓            | ✓            | ✓            | ✓               |
| ADMIN       | ✓                        | ✓            | ✓            | ✓            | —               |
| INSPECTOR   | ✓                        | ✓            | —            | —            | —               |
| CREW        | ✓                        | —            | ✓ (update)   | —            | —               |
| VIEWER      | ✓                        | —            | —            | —            | —               |

Enforced at the route layer with `requireRole`. Tenant scoping is enforced in
the service layer; every `WHERE` clause is keyed on `tenantId`.

## Transport / app surface

- `@fastify/helmet` for default headers (HSTS handled at the LB / Ingress).
- `@fastify/cors` with an explicit allowlist (`CORS_ORIGINS`).
- `@fastify/rate-limit` capping anonymous + per-IP at 600 req/min; probes
  excluded.
- Body limit 2 MiB; image bytes go through presigned PUT, never through
  the API.

## Storage

- Presigned S3 URLs are bound to a specific `contentType` and expire in 10 min.
- Image keys are namespaced `tenantId/trees/treeId/<ulid>.<ext>` so a
  bucket-policy regex can enforce tenant isolation as defense-in-depth.

## Auditing

- Every successful write hits `audit_events` with `(action, entity, entityId,
  actorId, ipAddress, metadata)`. Indexes support per-tenant time-series
  scans (compliance audits) and per-entity history.

## Secrets

- No secrets in the repo. `.env` is gitignored; `.env.example` lists every
  expected key.
- Rotate `JWT_SECRET` by issuing a new key and invalidating refresh tokens.
  `PASSWORD_PEPPER` rotation requires a backfill rehash; treat as a one-way
  decision.

## Known gaps (roadmap)

- WebAuthn / passkeys for admin roles.
- Tenant-scoped IP allowlist on `/v1/auth/login`.
- Field-level encryption for inspection notes (currently DB-at-rest only).
- SIEM integration (audit events → Loki / SIEM via Fluent Bit).
