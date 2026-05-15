# Contributing

Thanks for considering a contribution.

## Workflow

1. Open an issue describing the change before any non-trivial PR.
2. Branch from `main` using `feature/<short-name>` or `fix/<short-name>`.
3. Run `pnpm typecheck && pnpm --filter @utt/api test` before pushing.
4. Open a PR against `main`; CI must be green.

## Commit conventions

Use a short, imperative subject (≤ 72 chars). Reference issues with `#NNN`.
Examples:

- `api: add bbox filter to GET /v1/trees`
- `web: surface risk factor breakdown in detail panel`
- `infra: bump PostGIS to 16-3.5`

## Code style

- TypeScript strict mode is non-negotiable.
- No `any` without a `// safety:` comment justifying it.
- Tenant scoping is mandatory on every new query. Lint the diff for
  `WHERE "tenantId"` before requesting review.
- Spatial queries go through `prisma.$queryRaw` + parameterized SQL — never
  string-concatenate user input.

## Tests

- New API endpoints need at least one vitest test covering the auth + tenant
  guard.
- New risk factors get a fixture-based unit test.
