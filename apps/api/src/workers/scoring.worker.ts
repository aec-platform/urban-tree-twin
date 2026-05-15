import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { QUEUE_NAMES, type ScoringJobData } from '../lib/queues.js';
import { scoreImage } from '../services/scoring.service.js';

const worker = new Worker<ScoringJobData>(
  QUEUE_NAMES.scoring,
  async (job) => {
    return scoreImage(job.data.tenantId, job.data.imageId);
  },
  { connection: redis, concurrency: 4 },
);

worker.on('completed', (job) => {
  console.log(`[scoring] job ${job.id} completed image=${job.data.imageId}`);
});

worker.on('failed', (job, err) => {
  console.error(`[scoring] job ${job?.id} failed`, err.message);
});

console.log('Scoring worker started');
