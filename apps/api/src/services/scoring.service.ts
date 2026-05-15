import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { notFound } from '../lib/errors.js';
import type { HealthClass, ImageScoreResult } from '@utt/shared';

export const SCORING_MODEL_VERSION = 'mock-v0.3.0';

/**
 * Calls an external inference service when INFERENCE_URL is configured.
 * Otherwise produces deterministic, image-id-derived mock scores so the
 * full pipeline (queue -> persistence -> tree.healthScore update) can be
 * exercised end-to-end without GPU infrastructure.
 */
export async function scoreImage(
  tenantId: string,
  imageId: string,
): Promise<ImageScoreResult> {
  const image = await prisma.treeImage.findFirst({
    where: { id: imageId, tenantId },
  });
  if (!image) throw notFound('Image not found');

  let result: Omit<ImageScoreResult, 'imageId' | 'modelVersion' | 'inferredAt'>;

  if (config.INFERENCE_URL) {
    const res = await fetch(`${config.INFERENCE_URL}/score`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.INFERENCE_API_KEY ? { authorization: `Bearer ${config.INFERENCE_API_KEY}` } : {}),
      },
      body: JSON.stringify({ storageKey: image.storageKey, kind: image.kind }),
    });
    if (!res.ok) throw new Error(`Inference failed: ${res.status}`);
    result = (await res.json()) as typeof result;
  } else {
    const hash = [...imageId].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 1_000_003, 7);
    const score = 30 + (hash % 70);
    const cls: HealthClass =
      score >= 85 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 55 ? 'FAIR' : score >= 40 ? 'POOR' : 'CRITICAL';
    result = {
      healthScore: score,
      healthClass: cls,
      canopyDensityPct: 40 + (hash % 60),
      leafDiscolorationPct: hash % 35,
      defects: {
        cavity: ((hash >> 3) % 10) / 10,
        deadwood: ((hash >> 5) % 10) / 10,
        leaf_chlorosis: ((hash >> 7) % 10) / 10,
      },
    };
  }

  const now = new Date();
  await prisma.treeImage.update({
    where: { id: imageId },
    data: {
      scoredAt: now,
      modelVersion: SCORING_MODEL_VERSION,
      healthScore: result.healthScore,
      healthClass: result.healthClass,
      canopyDensityPct: result.canopyDensityPct,
      defectsScore: result.defects ?? undefined,
    },
  });

  // Aggregate tree-level health from latest image scores (last 6 months).
  const cutoff = new Date(Date.now() - 6 * 30 * 24 * 3600_000);
  const recent = await prisma.treeImage.findMany({
    where: { treeId: image.treeId, tenantId, scoredAt: { gte: cutoff } },
    select: { healthScore: true },
  });
  const scored = recent
    .map((r) => r.healthScore)
    .filter((s): s is number => typeof s === 'number');
  if (scored.length > 0) {
    const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
    const cls: HealthClass =
      avg >= 85 ? 'EXCELLENT' : avg >= 70 ? 'GOOD' : avg >= 55 ? 'FAIR' : avg >= 40 ? 'POOR' : 'CRITICAL';
    await prisma.tree.update({
      where: { id: image.treeId },
      data: { healthScore: avg, healthClass: cls, lastInspectedAt: now },
    });
  }

  return {
    imageId,
    modelVersion: SCORING_MODEL_VERSION,
    inferredAt: now.toISOString(),
    ...result,
  };
}
