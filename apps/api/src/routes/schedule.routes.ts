import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PruneTaskCreateInput, PruneTaskListQuery, PruneTaskUpdateInput } from '@utt/shared';
import {
  autoGenerateFromRisk,
  createTask,
  listTasks,
  updateTask,
} from '../services/schedule.service.js';
import { prisma } from '../lib/prisma.js';

const scheduleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/tasks', async (req) => {
    const q = PruneTaskListQuery.parse(req.query);
    return listTasks(req.session!.tenantId, q);
  });

  app.post(
    '/tasks',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN'])] },
    async (req) => {
      const input = PruneTaskCreateInput.parse(req.body);
      return createTask(req.session!.tenantId, input);
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/tasks/:id',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'CREW']) ] },
    async (req) => {
      const patch = PruneTaskUpdateInput.parse(req.body);
      return updateTask(req.session!.tenantId, req.params.id, patch);
    },
  );

  app.post(
    '/tasks/auto-generate',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN'])] },
    async (req) => {
      const Body = z.object({ horizonDays: z.number().int().min(1).max(180).default(30) });
      const { horizonDays } = Body.parse(req.body ?? {});
      const count = await autoGenerateFromRisk(req.session!.tenantId, horizonDays);
      return { created: count };
    },
  );

  app.get('/crews', async (req) => {
    return prisma.crew.findMany({
      where: { tenantId: req.session!.tenantId },
      orderBy: { name: 'asc' },
    });
  });

  app.post(
    '/crews',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN'])] },
    async (req) => {
      const Body = z.object({
        name: z.string().min(1).max(120),
        lead: z.string().max(120).optional(),
        contact: z.string().max(80).optional(),
      });
      const input = Body.parse(req.body);
      return prisma.crew.create({
        data: { tenantId: req.session!.tenantId, ...input },
      });
    },
  );
};

export default scheduleRoutes;
