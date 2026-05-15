import { z } from 'zod';
import { RiskLevel } from './enums.js';

export const WindScenario = z.object({
  label: z.string().min(1).max(80),
  gustMs: z.number().min(0).max(120),
  sustainedMs: z.number().min(0).max(120),
  directionDeg: z.number().min(0).max(360).optional(),
  source: z.string().max(80).optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});
export type WindScenario = z.infer<typeof WindScenario>;

export const RiskAssessmentInput = z.object({
  treeId: z.string().uuid(),
  scenario: WindScenario.optional(),
});

export const RiskFactor = z.object({
  code: z.string(),
  weight: z.number().min(0).max(1),
  contribution: z.number().min(0).max(100),
  rationale: z.string().max(240).optional(),
});

export const RiskAssessmentResult = z.object({
  treeId: z.string().uuid(),
  scenario: WindScenario.nullable(),
  failureProbability: z.number().min(0).max(1),
  impactScore: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  riskLevel: RiskLevel,
  factors: z.array(RiskFactor),
  modelVersion: z.string(),
  assessedAt: z.string().datetime(),
});
export type RiskAssessmentResult = z.infer<typeof RiskAssessmentResult>;
