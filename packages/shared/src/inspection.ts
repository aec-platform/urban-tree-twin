import { z } from 'zod';
import { HealthClass, InspectionMethod, ImageKind } from './enums.js';

export const InspectionDefectsRecord = z.record(z.string(), z.union([z.boolean(), z.number()]));
export type InspectionDefectsRecord = z.infer<typeof InspectionDefectsRecord>;

export const InspectionCreateInput = z.object({
  treeId: z.string().uuid(),
  performedAt: z.coerce.date().default(() => new Date()),
  method: InspectionMethod.default('VISUAL_GROUND'),
  healthClass: HealthClass.optional(),
  healthScore: z.number().min(0).max(100).optional(),
  canopyDensityPct: z.number().min(0).max(100).optional(),
  defects: InspectionDefectsRecord.optional(),
  notes: z.string().max(4000).optional(),
  imageIds: z.array(z.string().uuid()).max(40).optional(),
});
export type InspectionCreateInput = z.infer<typeof InspectionCreateInput>;

export const ImageUploadInit = z.object({
  treeId: z.string().uuid(),
  kind: ImageKind.default('OTHER'),
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|heic)$/i, 'Only JPEG/PNG/WebP/HEIC images are accepted'),
  byteSize: z.number().int().min(1).max(25 * 1024 * 1024),
});
export type ImageUploadInit = z.infer<typeof ImageUploadInit>;

export const ImageScoreRequest = z.object({
  imageId: z.string().uuid(),
});
export type ImageScoreRequest = z.infer<typeof ImageScoreRequest>;

export const ImageScoreResult = z.object({
  imageId: z.string().uuid(),
  healthScore: z.number().min(0).max(100),
  healthClass: HealthClass,
  canopyDensityPct: z.number().min(0).max(100).optional(),
  leafDiscolorationPct: z.number().min(0).max(100).optional(),
  defects: z.record(z.string(), z.number().min(0).max(1)).optional(),
  modelVersion: z.string(),
  inferredAt: z.string().datetime(),
});
export type ImageScoreResult = z.infer<typeof ImageScoreResult>;
