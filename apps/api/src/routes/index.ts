import type { FastifyPluginAsync } from 'fastify';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import treeRoutes from './tree.routes.js';
import inspectionRoutes from './inspection.routes.js';
import riskRoutes from './risk.routes.js';
import scheduleRoutes from './schedule.routes.js';

const routes: FastifyPluginAsync = async (app) => {
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(treeRoutes, { prefix: '/v1' });
  await app.register(inspectionRoutes, { prefix: '/v1' });
  await app.register(riskRoutes, { prefix: '/v1' });
  await app.register(scheduleRoutes, { prefix: '/v1' });
};

export default routes;
