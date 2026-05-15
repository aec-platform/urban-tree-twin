import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function recordAudit(args: {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await prisma.auditEvent.create({
    data: {
      tenantId: args.tenantId,
      actorId: args.actorId ?? null,
      action: args.action,
      entity: args.entity,
      entityId: args.entityId ?? null,
      metadata: args.metadata
        ? (args.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: args.ipAddress ?? null,
    },
  });
}
