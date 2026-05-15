import { z } from 'zod';
import { PruneAction, ScheduleStatus } from './enums.js';

export const PruneTaskCreateInput = z.object({
  treeId: z.string().uuid(),
  action: PruneAction,
  scheduledFor: z.coerce.date(),
  priority: z.number().int().min(1).max(5).default(3),
  estimatedHours: z.number().min(0.1).max(40).optional(),
  crewId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export type PruneTaskCreateInput = z.infer<typeof PruneTaskCreateInput>;

export const PruneTaskUpdateInput = z.object({
  scheduledFor: z.coerce.date().optional(),
  status: ScheduleStatus.optional(),
  crewId: z.string().uuid().optional(),
  completedAt: z.coerce.date().optional(),
  resultNotes: z.string().max(4000).optional(),
});
export type PruneTaskUpdateInput = z.infer<typeof PruneTaskUpdateInput>;

export const PruneTaskListQuery = z.object({
  status: ScheduleStatus.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  crewId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(),
});
export type PruneTaskListQuery = z.infer<typeof PruneTaskListQuery>;
