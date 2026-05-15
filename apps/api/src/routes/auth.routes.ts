import type { FastifyPluginAsync } from 'fastify';
import { LoginInput, RefreshInput, SignupInput } from '@utt/shared';
import { login, rotateRefresh, revokeRefresh, signup } from '../services/auth.service.js';

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/signup', async (req) => {
    const input = SignupInput.parse(req.body);
    const session = await signup(input);
    const accessToken = await app.jwt.sign(session);
    return { session, accessToken };
  });

  app.post('/auth/login', async (req) => {
    const input = LoginInput.parse(req.body);
    const { session, refreshTokenRaw } = await login(input, {
      ip: req.ip,
      ua: req.headers['user-agent'] ?? undefined,
    });
    const accessToken = await app.jwt.sign(session);
    return { session, accessToken, refreshToken: refreshTokenRaw };
  });

  app.post('/auth/refresh', async (req) => {
    const { refreshToken } = RefreshInput.parse(req.body);
    const { session, refreshTokenRaw } = await rotateRefresh(refreshToken, {
      ip: req.ip,
      ua: req.headers['user-agent'] ?? undefined,
    });
    const accessToken = await app.jwt.sign(session);
    return { session, accessToken, refreshToken: refreshTokenRaw };
  });

  app.post('/auth/logout', async (req, reply) => {
    const { refreshToken } = RefreshInput.parse(req.body);
    await revokeRefresh(refreshToken);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (req) => {
    return { session: req.session };
  });
};

export default authRoutes;
