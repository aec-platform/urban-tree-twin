import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req, reply) => {
    const requestId = req.id;

    if (err instanceof ZodError) {
      req.log.warn({ err, requestId }, 'validation error');
      return reply.status(400).send({
        code: 'VALIDATION',
        message: 'Request validation failed',
        details: err.flatten(),
        requestId,
      });
    }

    if (err instanceof AppError) {
      req.log.warn({ err: err.message, code: err.code, requestId }, 'app error');
      return reply.status(err.statusCode).send({
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      });
    }

    if ((err as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        requestId,
      });
    }

    req.log.error({ err, requestId }, 'unhandled error');
    return reply.status(500).send({
      code: 'INTERNAL',
      message: 'Internal server error',
      requestId,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      requestId: req.id,
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'utt-errors' });
