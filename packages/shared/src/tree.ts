import { z } from 'zod';
import { LngLat, PointGeoJSON } from './geo.js';
import { TreeStatus, HealthClass } from './enums.js';

export const TreeSpecies = z.object({
  scientificName: z.string().min(1).max(120),
  commonNameVi: z.string().min(1).max(120),
  commonNameEn: z.string().max(120).optional(),
  family: z.string().max(120).optional(),
  nativeToVN: z.boolean().optional(),
});
export type TreeSpecies = z.infer<typeof TreeSpecies>;

export const TreeCreateInput = z.object({
  externalCode: z.string().max(64).optional(),
  speciesId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  location: LngLat,
  address: z.string().max(255).optional(),
  ward: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  province: z.string().max(120).optional(),
  plantedAt: z.coerce.date().optional(),
  heightM: z.number().min(0).max(120).optional(),
  dbhCm: z.number().min(0).max(500).optional(),
  canopyRadiusM: z.number().min(0).max(60).optional(),
  status: TreeStatus.default('ALIVE'),
  notes: z.string().max(2000).optional(),
});
export type TreeCreateInput = z.infer<typeof TreeCreateInput>;

export const TreeUpdateInput = TreeCreateInput.partial();
export type TreeUpdateInput = z.infer<typeof TreeUpdateInput>;

export const TreeListQuery = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .optional(),
  zoneId: z.string().uuid().optional(),
  speciesId: z.string().uuid().optional(),
  status: TreeStatus.optional(),
  health: HealthClass.optional(),
  q: z.string().max(120).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export type TreeListQuery = z.infer<typeof TreeListQuery>;

export const TreeDTO = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  externalCode: z.string().nullable(),
  speciesId: z.string().uuid().nullable(),
  zoneId: z.string().uuid().nullable(),
  geom: PointGeoJSON,
  address: z.string().nullable(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  plantedAt: z.string().datetime().nullable(),
  heightM: z.number().nullable(),
  dbhCm: z.number().nullable(),
  canopyRadiusM: z.number().nullable(),
  status: TreeStatus,
  healthClass: HealthClass.nullable(),
  healthScore: z.number().min(0).max(100).nullable(),
  riskScore: z.number().min(0).max(100).nullable(),
  lastInspectedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TreeDTO = z.infer<typeof TreeDTO>;
