import { z } from 'zod';

export const TreeStatus = z.enum([
  'ALIVE',
  'DEAD',
  'REMOVED',
  'STUMP',
  'PLANNED',
  'NEWLY_PLANTED',
]);
export type TreeStatus = z.infer<typeof TreeStatus>;

export const HealthClass = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL']);
export type HealthClass = z.infer<typeof HealthClass>;

export const RiskLevel = z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const InspectionMethod = z.enum([
  'VISUAL_GROUND',
  'AERIAL_DRONE',
  'CLIMBING',
  'INSTRUMENT_RESI',
  'AUTOMATED_IMAGE',
]);
export type InspectionMethod = z.infer<typeof InspectionMethod>;

export const PruneAction = z.enum([
  'CROWN_CLEAN',
  'CROWN_THIN',
  'CROWN_RAISE',
  'CROWN_REDUCE',
  'POLLARD',
  'DEADWOOD',
  'STRUCTURAL',
  'EMERGENCY',
  'REMOVAL',
]);
export type PruneAction = z.infer<typeof PruneAction>;

export const ScheduleStatus = z.enum([
  'DRAFT',
  'PLANNED',
  'DISPATCHED',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED',
]);
export type ScheduleStatus = z.infer<typeof ScheduleStatus>;

export const UserRole = z.enum(['OWNER', 'ADMIN', 'INSPECTOR', 'CREW', 'VIEWER']);
export type UserRole = z.infer<typeof UserRole>;

export const ImageKind = z.enum(['CANOPY', 'TRUNK', 'ROOT_FLARE', 'LEAF', 'DAMAGE', 'OTHER']);
export type ImageKind = z.infer<typeof ImageKind>;
