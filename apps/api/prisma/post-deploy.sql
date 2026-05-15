-- Post-deploy SQL applied after `prisma migrate deploy`.
-- PostGIS columns are managed by Prisma via Unsupported(), but spatial indexes
-- and supporting triggers must be created manually.

-- Spatial indexes for fast bbox / proximity queries.
CREATE INDEX IF NOT EXISTS trees_geom_gix ON trees USING GIST (geom);
CREATE INDEX IF NOT EXISTS zones_boundary_gix ON zones USING GIST (boundary);

-- Tenant-scoped spatial indexes for multi-tenant bbox filtering.
CREATE INDEX IF NOT EXISTS trees_tenant_geom_gix
  ON trees USING GIST ("tenantId", geom);

-- Fuzzy address search.
CREATE INDEX IF NOT EXISTS trees_address_trgm
  ON trees USING GIN (address gin_trgm_ops);

-- Ensure latitude/longitude sanity (bbox of mainland VN + buffer).
-- Loose enough to allow island provinces and overseas pilots.
ALTER TABLE trees
  DROP CONSTRAINT IF EXISTS trees_geom_valid_check,
  ADD CONSTRAINT trees_geom_valid_check
  CHECK (ST_IsValid(geom) AND ST_SRID(geom) = 4326);
