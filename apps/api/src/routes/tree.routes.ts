import type { FastifyPluginAsync } from 'fastify';
import { TreeCreateInput, TreeListQuery, TreeUpdateInput } from '@utt/shared';
import { recordAudit } from '../lib/audit.js';
import {
  createTree,
  getTree,
  listTrees,
  softDeleteTree,
  updateTree,
} from '../services/tree.service.js';

const treeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/trees', async (req) => {
    const q = TreeListQuery.parse(req.query);
    return listTrees(req.session!.tenantId, q);
  });

  app.get<{ Params: { id: string } }>('/trees/:id', async (req) => {
    return getTree(req.session!.tenantId, req.params.id);
  });

  app.post(
    '/trees',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR'])] },
    async (req) => {
      const input = TreeCreateInput.parse(req.body);
      const tree = await createTree(req.session!.tenantId, input);
      await recordAudit({
        tenantId: req.session!.tenantId,
        actorId: req.session!.userId,
        action: 'tree.create',
        entity: 'tree',
        entityId: tree.id,
        ipAddress: req.ip,
      });
      return tree;
    },
  );

  app.patch<{ Params: { id: string } }>(
    '/trees/:id',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR'])] },
    async (req) => {
      const input = TreeUpdateInput.parse(req.body);
      const tree = await updateTree(req.session!.tenantId, req.params.id, input);
      await recordAudit({
        tenantId: req.session!.tenantId,
        actorId: req.session!.userId,
        action: 'tree.update',
        entity: 'tree',
        entityId: tree.id,
        metadata: { fields: Object.keys(input) },
        ipAddress: req.ip,
      });
      return tree;
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/trees/:id',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN'])] },
    async (req, reply) => {
      await softDeleteTree(req.session!.tenantId, req.params.id);
      await recordAudit({
        tenantId: req.session!.tenantId,
        actorId: req.session!.userId,
        action: 'tree.delete',
        entity: 'tree',
        entityId: req.params.id,
        ipAddress: req.ip,
      });
      return reply.status(204).send();
    },
  );
};

export default treeRoutes;
