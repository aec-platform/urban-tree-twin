import type { FastifyPluginAsync } from 'fastify';
import { ImageUploadInit, InspectionCreateInput } from '@utt/shared';
import { prisma } from '../lib/prisma.js';
import { buildImageKey, presignDownload, presignUpload } from '../lib/storage.js';
import { scoringQueue } from '../lib/queues.js';
import { notFound } from '../lib/errors.js';

const inspectionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/inspections',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR'])] },
    async (req) => {
      const input = InspectionCreateInput.parse(req.body);
      const inspection = await prisma.inspection.create({
        data: {
          tenantId: req.session!.tenantId,
          treeId: input.treeId,
          inspectorId: req.session!.userId,
          performedAt: input.performedAt,
          method: input.method,
          healthClass: input.healthClass ?? null,
          healthScore: input.healthScore ?? null,
          canopyDensityPct: input.canopyDensityPct ?? null,
          defects: input.defects ?? undefined,
          notes: input.notes ?? null,
          images: input.imageIds
            ? { connect: input.imageIds.map((id) => ({ id })) }
            : undefined,
        },
      });
      if (input.healthScore != null || input.healthClass) {
        await prisma.tree.update({
          where: { id: input.treeId },
          data: {
            healthScore: input.healthScore ?? undefined,
            healthClass: input.healthClass ?? undefined,
            lastInspectedAt: input.performedAt,
          },
        });
      }
      return inspection;
    },
  );

  app.get<{ Querystring: { treeId: string } }>('/inspections', async (req) => {
    const treeId = req.query.treeId;
    return prisma.inspection.findMany({
      where: { tenantId: req.session!.tenantId, treeId },
      orderBy: { performedAt: 'desc' },
      take: 50,
      include: { images: true, inspector: { select: { id: true, fullName: true } } },
    });
  });

  app.post(
    '/images/uploads',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR', 'CREW'])] },
    async (req) => {
      const input = ImageUploadInit.parse(req.body);
      const tree = await prisma.tree.findFirst({
        where: { id: input.treeId, tenantId: req.session!.tenantId, deletedAt: null },
      });
      if (!tree) throw notFound('Tree not found');

      const key = buildImageKey(req.session!.tenantId, input.treeId, input.contentType);
      const image = await prisma.treeImage.create({
        data: {
          tenantId: req.session!.tenantId,
          treeId: input.treeId,
          kind: input.kind,
          storageKey: key,
          contentType: input.contentType,
          byteSize: input.byteSize,
        },
      });
      const uploadUrl = await presignUpload({ key, contentType: input.contentType });
      return { image, uploadUrl };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/images/:id/finalize',
    { preHandler: [app.requireRole(['OWNER', 'ADMIN', 'INSPECTOR', 'CREW'])] },
    async (req) => {
      const image = await prisma.treeImage.findFirst({
        where: { id: req.params.id, tenantId: req.session!.tenantId },
      });
      if (!image) throw notFound('Image not found');
      await scoringQueue.add(
        'score',
        { tenantId: image.tenantId, imageId: image.id },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
      return { queued: true };
    },
  );

  app.get<{ Params: { id: string } }>('/images/:id/url', async (req) => {
    const image = await prisma.treeImage.findFirst({
      where: { id: req.params.id, tenantId: req.session!.tenantId },
    });
    if (!image) throw notFound('Image not found');
    const url = await presignDownload({ key: image.storageKey });
    return { url };
  });
};

export default inspectionRoutes;
