import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { QUEUE_NAMES, type RiskJobData } from '../lib/queues.js';
import { assessRisk } from '../services/risk.service.js';

const worker = new Worker<RiskJobData>(
  QUEUE_NAMES.risk,
  async (job) => {
    const scenario =
      job.data.windGustMs != null && job.data.windSustainedMs != null
        ? {
            label: job.data.scenarioLabel ?? 'queued',
            gustMs: job.data.windGustMs,
            sustainedMs: job.data.windSustainedMs,
          }
        : undefined;
    return assessRisk(job.data.tenantId, job.data.treeId, scenario);
  },
  { connection: redis, concurrency: 8 },
);

worker.on('completed', (job) => {
  console.log(`[risk] job ${job.id} completed tree=${job.data.treeId}`);
});
worker.on('failed', (job, err) => {
  console.error(`[risk] job ${job?.id} failed`, err.message);
});

console.log('Risk worker started');
