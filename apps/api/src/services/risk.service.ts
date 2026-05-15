import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import type { RiskAssessmentResult, RiskLevel, WindScenario } from '@utt/shared';

export const RISK_MODEL_VERSION = 'rule-v1.0.0';

interface TreeFeatures {
  id: string;
  tenantId: string;
  lng: number;
  lat: number;
  heightM: number | null;
  dbhCm: number | null;
  canopyRadiusM: number | null;
  healthScore: number | null;
  status: string;
  speciesFailureProneness: number | null;
  recentDefects: Record<string, number | boolean> | null;
}

async function loadTreeFeatures(tenantId: string, treeId: string): Promise<TreeFeatures> {
  const rows = (await prisma.$queryRaw`
    SELECT t.id, t."tenantId",
           ST_X(t.geom) AS lng, ST_Y(t.geom) AS lat,
           t."heightM", t."dbhCm", t."canopyRadiusM",
           t."healthScore", t.status::text AS status,
           s."failureProneness" AS "speciesFailureProneness",
           (
             SELECT i.defects FROM inspections i
             WHERE i."treeId" = t.id ORDER BY i."performedAt" DESC LIMIT 1
           ) AS "recentDefects"
    FROM trees t
    LEFT JOIN species s ON s.id = t."speciesId"
    WHERE t.id = ${treeId}::uuid AND t."tenantId" = ${tenantId}::uuid AND t."deletedAt" IS NULL
  `) as TreeFeatures[];
  const f = rows[0];
  if (!f) throw notFound('Tree not found');
  return f;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

const toRiskLevel = (score: number): RiskLevel => {
  if (score >= 80) return 'EXTREME';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MODERATE';
  return 'LOW';
};

/**
 * Transparent rule-based scorer. Designed as a placeholder for a learned
 * model — keeps factor contributions explicit so the UI can explain *why*
 * a tree is flagged.
 */
export async function assessRisk(
  tenantId: string,
  treeId: string,
  scenario?: WindScenario,
): Promise<RiskAssessmentResult> {
  const f = await loadTreeFeatures(tenantId, treeId);
  const factors: RiskAssessmentResult['factors'] = [];

  // Health contribution (lower health -> higher failure probability).
  const healthScore = f.healthScore ?? 50;
  const healthDeficit = (100 - healthScore) / 100;
  factors.push({
    code: 'health_deficit',
    weight: 0.3,
    contribution: Math.round(healthDeficit * 30),
    rationale: `Recent health score ${healthScore.toFixed(0)}/100`,
  });

  // Species proneness.
  const proneness = f.speciesFailureProneness ?? 0.4;
  factors.push({
    code: 'species_proneness',
    weight: 0.15,
    contribution: Math.round(proneness * 15),
    rationale: `Species failure rate ~${(proneness * 100).toFixed(0)}%`,
  });

  // Defect detection from latest inspection.
  const d = f.recentDefects ?? {};
  const defectScore =
    Number(d.cavity ?? 0) * 0.25 +
    Number(d.cracks ?? 0) * 0.25 +
    Number(d.fungalFruiting ?? 0) * 0.2 +
    Number(d.rootDamage ?? 0) * 0.3 +
    (Number(d.leanAngleDeg ?? 0) >= 10 ? 0.4 : 0) +
    (Number(d.deadwoodPct ?? 0) >= 25 ? 0.2 : 0);
  factors.push({
    code: 'defects',
    weight: 0.25,
    contribution: Math.min(25, Math.round(defectScore * 25)),
    rationale: defectScore > 0 ? 'Defects observed on last inspection' : 'No major defects logged',
  });

  // Size / sail area — proportional to canopy radius squared * height.
  const canopy = f.canopyRadiusM ?? 3;
  const height = f.heightM ?? 8;
  const sail = Math.min(1, (canopy * canopy * height) / 600);
  factors.push({
    code: 'sail_area',
    weight: 0.15,
    contribution: Math.round(sail * 15),
    rationale: `Canopy radius ${canopy.toFixed(1)}m · height ${height.toFixed(1)}m`,
  });

  // Wind scenario.
  const gust = scenario?.gustMs ?? 25;
  const sustained = scenario?.sustainedMs ?? 18;
  const windPressure = sigmoid((gust - 30) / 8);
  factors.push({
    code: 'wind_load',
    weight: 0.15,
    contribution: Math.round(windPressure * 15),
    rationale: scenario
      ? `Scenario "${scenario.label}": gust ${gust} m/s, sustained ${sustained} m/s`
      : `Baseline wind (gust ${gust} m/s)`,
  });

  const sum = factors.reduce((acc, x) => acc + x.contribution, 0);
  const riskScore = Math.max(0, Math.min(100, sum));
  const failureProbability = Math.max(0.01, Math.min(0.99, riskScore / 110));

  // Impact: trees near roads / tall trees imply higher consequence; without
  // road overlay we approximate with size — a real deployment overlays
  // OSM highways / building footprints.
  const impactScore = Math.round(Math.min(100, height * 4 + canopy * 5));

  const composed = Math.round(0.7 * riskScore + 0.3 * impactScore);
  const riskLevel = toRiskLevel(composed);

  const saved = await prisma.riskAssessment.create({
    data: {
      tenantId,
      treeId,
      scenarioLabel: scenario?.label ?? null,
      windGustMs: scenario?.gustMs ?? null,
      windSustainedMs: scenario?.sustainedMs ?? null,
      failureProbability,
      impactScore,
      riskScore: composed,
      riskLevel,
      factors: factors as unknown as object,
      modelVersion: RISK_MODEL_VERSION,
    },
  });

  await prisma.tree.update({
    where: { id: treeId },
    data: { riskScore: composed, riskLevel },
  });

  return {
    treeId,
    scenario: scenario ?? null,
    failureProbability,
    impactScore,
    riskScore: composed,
    riskLevel,
    factors,
    modelVersion: RISK_MODEL_VERSION,
    assessedAt: saved.assessedAt.toISOString(),
  };
}
