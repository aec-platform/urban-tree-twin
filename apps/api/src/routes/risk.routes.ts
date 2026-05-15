import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { RiskAssessmentInput, WindScenario } from '@utt/shared';
import { assessRisk } from '../services/risk.service.js';
import { riskQueue } from '../lib/queues.js';
import { prisma } from '../lib/prisma.js';

const BatchInput = z.object({
  zoneId: z.string().uuid().optional(),
  scenario: WindScenario.optional(),
  limit: z.number().int().min(1).max(2000).default(500),
});

const riskRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.post('/risk/assess', async (req) => {
    const input = RiskAssessmentInput.parse(req.body);
    return assessRisk(req.session!.tenantId, input.treeId, input.scenario);
  });

  app.post(
    '/risk/batch',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR'])] },
    async (req) => {
      const input = BatchInput.parse(req.body);
      const trees = await prisma.tree.findMany({
        where: {
          tenantId: req.session!.tenantId,
          deletedAt: null,
          ...(input.zoneId ? { zoneId: input.zoneId } : {}),
        },
        select: { id: true },
        take: input.limit,
      });
      for (const t of trees) {
        await riskQueue.add(
          'assess',
          {
            tenantId: req.session!.tenantId,
            treeId: t.id,
            scenarioLabel: input.scenario?.label,
            windGustMs: input.scenario?.gustMs,
            windSustainedMs: input.scenario?.sustainedMs,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      }
      return { queued: trees.length };
    },
  );

  app.get('/risk/summary', async (req) => {
    const groups = await prisma.tree.groupBy({
      by: ['riskLevel'],
      where: { tenantId: req.session!.tenantId, deletedAt: null },
      _count: { _all: true },
    });
    const summary = { LOW: 0, MODERATE: 0, HIGH: 0, EXTREME: 0, UNASSESSED: 0 };
    for (const g of groups) {
      const key = g.riskLevel ?? 'UNASSESSED';
      summary[key] = g._count._all;
    }
    return summary;
  });
};

export default riskRoutes;
