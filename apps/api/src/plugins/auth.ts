import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { unauthorized, forbidden } from '../lib/errors.js';
import type { UserRole, SessionUser } from '@utt/shared';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest) => Promise<void>;
    requireRole: (roles: UserRole[]) => (req: FastifyRequest) => Promise<void>;
  }
  interface FastifyRequest {
    session?: SessionUser;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: `${config.JWT_ACCESS_TTL}s` },
  });

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
      req.session = req.user;
    } catch {
      throw unauthorized('Invalid or expired token');
    }
  });

  app.decorate('requireRole', (roles: UserRole[]) => async (req: FastifyRequest) => {
    if (!req.session) throw unauthorized();
    if (!roles.includes(req.session.role)) {
      throw forbidden(`Requires role: ${roles.join(', ')}`);
    }
  });
};

export default fp(authPlugin, { name: 'utt-auth' });
