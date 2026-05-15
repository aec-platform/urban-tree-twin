import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import type { TreeCreateInput, TreeUpdateInput, TreeListQuery, TreeDTO, BBox } from '@utt/shared';

interface TreeRow {
  id: string;
  tenantId: string;
  externalCode: string | null;
  speciesId: string | null;
  zoneId: string | null;
  lng: number;
  lat: number;
  address: string | null;
  ward: string | null;
  district: string | null;
  province: string | null;
  plantedAt: Date | null;
  heightM: number | null;
  dbhCm: number | null;
  canopyRadiusM: number | null;
  status: string;
  healthClass: string | null;
  healthScore: number | null;
  riskScore: number | null;
  lastInspectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const toDTO = (r: TreeRow): TreeDTO => ({
  id: r.id,
  tenantId: r.tenantId,
  externalCode: r.externalCode,
  speciesId: r.speciesId,
  zoneId: r.zoneId,
  geom: { type: 'Point', coordinates: [r.lng, r.lat] },
  address: r.address,
  ward: r.ward,
  district: r.district,
  province: r.province,
  plantedAt: r.plantedAt ? r.plantedAt.toISOString() : null,
  heightM: r.heightM,
  dbhCm: r.dbhCm,
  canopyRadiusM: r.canopyRadiusM,
  status: r.status as TreeDTO['status'],
  healthClass: r.healthClass as TreeDTO['healthClass'],
  healthScore: r.healthScore,
  riskScore: r.riskScore,
  lastInspectedAt: r.lastInspectedAt ? r.lastInspectedAt.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const parseBBox = (s: string): BBox => {
  const parts = s.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error('Invalid bbox');
  }
  return parts as BBox;
};

export async function listTrees(tenantId: string, q: TreeListQuery) {
  const where: string[] = [`t."tenantId" = $1::uuid`, `t."deletedAt" IS NULL`];
  const params: unknown[] = [tenantId];

  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = parseBBox(q.bbox);
    where.push(
      `t.geom && ST_MakeEnvelope($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, 4326)`,
    );
    params.push(minLng, minLat, maxLng, maxLat);
  }
  if (q.zoneId) {
    where.push(`t."zoneId" = $${params.length + 1}::uuid`);
    params.push(q.zoneId);
  }
  if (q.speciesId) {
    where.push(`t."speciesId" = $${params.length + 1}::uuid`);
    params.push(q.speciesId);
  }
  if (q.status) {
    where.push(`t.status = $${params.length + 1}::"TreeStatus"`);
    params.push(q.status);
  }
  if (q.health) {
    where.push(`t."healthClass" = $${params.length + 1}::"HealthClass"`);
    params.push(q.health);
  }
  if (q.q) {
    where.push(`(t.address ILIKE $${params.length + 1} OR t."externalCode" ILIKE $${params.length + 1})`);
    params.push(`%${q.q}%`);
  }
  if (q.cursor) {
    where.push(`t.id > $${params.length + 1}::uuid`);
    params.push(q.cursor);
  }

  const limit = Math.min(q.limit + 1, 501);
  const sql = `
    SELECT t.id, t."tenantId", t."externalCode", t."speciesId", t."zoneId",
           ST_X(t.geom) AS lng, ST_Y(t.geom) AS lat,
           t.address, t.ward, t.district, t.province,
           t."plantedAt", t."heightM", t."dbhCm", t."canopyRadiusM",
           t.status::text AS status,
           t."healthClass"::text AS "healthClass",
           t."healthScore", t."riskScore",
           t."lastInspectedAt", t."createdAt", t."updatedAt"
    FROM trees t
    WHERE ${where.join(' AND ')}
    ORDER BY t.id
    LIMIT ${limit}
  `;

  const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as TreeRow[];
  const items = rows.slice(0, q.limit).map(toDTO);
  const nextCursor = rows.length > q.limit ? rows[q.limit - 1]!.id : null;
  return { items, nextCursor };
}

export async function getTree(tenantId: string, id: string): Promise<TreeDTO> {
  const rows = (await prisma.$queryRaw`
    SELECT t.id, t."tenantId", t."externalCode", t."speciesId", t."zoneId",
           ST_X(t.geom) AS lng, ST_Y(t.geom) AS lat,
           t.address, t.ward, t.district, t.province,
           t."plantedAt", t."heightM", t."dbhCm", t."canopyRadiusM",
           t.status::text AS status,
           t."healthClass"::text AS "healthClass",
           t."healthScore", t."riskScore",
           t."lastInspectedAt", t."createdAt", t."updatedAt"
    FROM trees t
    WHERE t.id = ${id}::uuid AND t."tenantId" = ${tenantId}::uuid AND t."deletedAt" IS NULL
  `) as TreeRow[];
  const row = rows[0];
  if (!row) throw notFound('Tree not found');
  return toDTO(row);
}

export async function createTree(tenantId: string, input: TreeCreateInput): Promise<TreeDTO> {
  const rows = (await prisma.$queryRaw`
    INSERT INTO trees (
      id, "tenantId", "externalCode", "speciesId", "zoneId", geom,
      address, ward, district, province, "plantedAt", "heightM", "dbhCm",
      "canopyRadiusM", status, notes, "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(), ${tenantId}::uuid, ${input.externalCode ?? null},
      ${input.speciesId ?? null}::uuid, ${input.zoneId ?? null}::uuid,
      ST_SetSRID(ST_MakePoint(${input.location.lng}, ${input.location.lat}), 4326),
      ${input.address ?? null}, ${input.ward ?? null}, ${input.district ?? null},
      ${input.province ?? null}, ${input.plantedAt ?? null}, ${input.heightM ?? null},
      ${input.dbhCm ?? null}, ${input.canopyRadiusM ?? null},
      ${input.status ?? 'ALIVE'}::"TreeStatus", ${input.notes ?? null}, NOW(), NOW()
    )
    RETURNING id, "tenantId", "externalCode", "speciesId", "zoneId",
              ST_X(geom) AS lng, ST_Y(geom) AS lat,
              address, ward, district, province,
              "plantedAt", "heightM", "dbhCm", "canopyRadiusM",
              status::text AS status,
              "healthClass"::text AS "healthClass",
              "healthScore", "riskScore", "lastInspectedAt", "createdAt", "updatedAt"
  `) as TreeRow[];
  return toDTO(rows[0]!);
}

export async function updateTree(
  tenantId: string,
  id: string,
  input: TreeUpdateInput,
): Promise<TreeDTO> {
  await getTree(tenantId, id);

  const sets: string[] = [];
  const params: unknown[] = [];

  if (input.externalCode !== undefined) {
    sets.push(`"externalCode" = $${params.length + 1}`);
    params.push(input.externalCode);
  }
  if (input.speciesId !== undefined) {
    sets.push(`"speciesId" = $${params.length + 1}::uuid`);
    params.push(input.speciesId);
  }
  if (input.zoneId !== undefined) {
    sets.push(`"zoneId" = $${params.length + 1}::uuid`);
    params.push(input.zoneId);
  }
  if (input.location !== undefined) {
    sets.push(
      `geom = ST_SetSRID(ST_MakePoint($${params.length + 1}, $${params.length + 2}), 4326)`,
    );
    params.push(input.location.lng, input.location.lat);
  }
  for (const key of ['address', 'ward', 'district', 'province', 'notes'] as const) {
    if (input[key] !== undefined) {
      sets.push(`"${key}" = $${params.length + 1}`);
      params.push(input[key]);
    }
  }
  for (const key of ['heightM', 'dbhCm', 'canopyRadiusM'] as const) {
    if (input[key] !== undefined) {
      sets.push(`"${key}" = $${params.length + 1}`);
      params.push(input[key]);
    }
  }
  if (input.plantedAt !== undefined) {
    sets.push(`"plantedAt" = $${params.length + 1}`);
    params.push(input.plantedAt);
  }
  if (input.status !== undefined) {
    sets.push(`status = $${params.length + 1}::"TreeStatus"`);
    params.push(input.status);
  }
  sets.push(`"updatedAt" = NOW()`);

  if (sets.length === 1) {
    return getTree(tenantId, id);
  }

  const idIdx = params.length + 1;
  const tenantIdx = params.length + 2;
  params.push(id, tenantId);

  await prisma.$executeRawUnsafe(
    `UPDATE trees SET ${sets.join(', ')} WHERE id = $${idIdx}::uuid AND "tenantId" = $${tenantIdx}::uuid`,
    ...params,
  );

  return getTree(tenantId, id);
}

export async function softDeleteTree(tenantId: string, id: string) {
  await getTree(tenantId, id);
  await prisma.$executeRaw`
    UPDATE trees SET "deletedAt" = NOW(), status = 'REMOVED'::"TreeStatus"
    WHERE id = ${id}::uuid AND "tenantId" = ${tenantId}::uuid
  `;
}
