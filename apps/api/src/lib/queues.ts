import { Queue } from 'bullmq';
import { redis } from './redis.js';

export const QUEUE_NAMES = {
  scoring: 'utt:scoring',
  risk: 'utt:risk',
} as const;

export const scoringQueue = new Queue(QUEUE_NAMES.scoring, { connection: redis });
export const riskQueue = new Queue(QUEUE_NAMES.risk, { connection: redis });

export interface ScoringJobData {
  tenantId: string;
  imageId: string;
}

export interface RiskJobData {
  tenantId: string;
  treeId: string;
  scenarioLabel?: string;
  windGustMs?: number;
  windSustainedMs?: number;
}
