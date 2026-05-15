import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  // BullMQ shares this client; only log connection-level errors here.
  if (process.env.NODE_ENV !== 'test') {
    console.error('[redis] error', err.message);
  }
});
