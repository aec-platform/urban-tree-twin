import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import type {
  PruneTaskCreateInput,
  PruneTaskUpdateInput,
  PruneTaskListQuery,
} from '@utt/shared';

export async function createTask(tenantId: string, input: PruneTaskCreateInput) {
  return prisma.pruneTask.create({
    data: {
      tenantId,
      treeId: input.treeId,
      action: input.action,
      priority: input.priority,
      scheduledFor: input.scheduledFor,
      estimatedHours: input.estimatedHours ?? null,
      crewId: input.crewId ?? null,
      notes: input.notes ?? null,
      status: 'PLANNED',
    },
  });
}

export async function listTasks(tenantId: string, q: PruneTaskListQuery) {
  const limit = q.limit;
  const tasks = await prisma.pruneTask.findMany({
    where: {
      tenantId,
      status: q.status ?? undefined,
      crewId: q.crewId ?? undefined,
      scheduledFor: {
        gte: q.from ?? undefined,
        lte: q.to ?? undefined,
      },
      ...(q.zoneId ? { tree: { zoneId: q.zoneId } } : {}),
      ...(q.cursor ? { id: { gt: q.cursor } } : {}),
    },
    orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    include: {
      tree: {
        select: { id: true, externalCode: true, address: true, healthClass: true, riskLevel: true },
      },
      crew: { select: { id: true, name: true } },
    },
  });
  const items = tasks.slice(0, limit);
  const nextCursor = tasks.length > limit ? items[items.length - 1]!.id : null;
  return { items, nextCursor };
}

export async function updateTask(tenantId: string, id: string, patch: PruneTaskUpdateInput) {
  const existing = await prisma.pruneTask.findFirst({ where: { id, tenantId } });
  if (!existing) throw notFound('Task not found');
  return prisma.pruneTask.update({
    where: { id },
    data: {
      scheduledFor: patch.scheduledFor ?? undefined,
      status: patch.status ?? undefined,
      crewId: patch.crewId ?? undefined,
      completedAt: patch.status === 'DONE' ? patch.completedAt ?? new Date() : patch.completedAt ?? undefined,
      resultNotes: patch.resultNotes ?? undefined,
    },
  });
}

/**
 * Auto-generate pruning tasks for trees flagged HIGH/EXTREME and unscheduled.
 * Returns the number of tasks created.
 */
export async function autoGenerateFromRisk(tenantId: string, horizonDays = 30) {
  const due = new Date(Date.now() + horizonDays * 24 * 3600_000);
  const candidates = await prisma.tree.findMany({
    where: {
      tenantId,
      deletedAt: null,
      riskLevel: { in: ['HIGH', 'EXTREME'] },
      tasks: {
        none: { status: { in: ['PLANNED', 'DISPATCHED', 'IN_PROGRESS'] } },
      },
    },
    select: { id: true, riskLevel: true },
    take: 500,
  });

  if (candidates.length === 0) return 0;

  const data = candidates.map((t) => ({
    tenantId,
    treeId: t.id,
    action: (t.riskLevel === 'EXTREME' ? 'EMERGENCY' : 'CROWN_REDUCE') as
      | 'EMERGENCY'
      | 'CROWN_REDUCE',
    priority: t.riskLevel === 'EXTREME' ? 1 : 2,
    scheduledFor: due,
    status: 'PLANNED' as const,
    notes: 'Auto-generated from risk assessment',
  }));

  const result = await prisma.pruneTask.createMany({ data });
  return result.count;
}
