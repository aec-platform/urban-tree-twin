'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import type { TreeDTO, RiskLevel } from '@utt/shared';

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://demotiles.maplibre.org/style.json';
const DEFAULT_LAT = Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? 21.0285);
const DEFAULT_LNG = Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? 105.8542);

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#3f8a58',
  MODERATE: '#d9a13b',
  HIGH: '#d96a3b',
  EXTREME: '#b53a2d',
};
const UNASSESSED_COLOR = '#8fbf9a';

interface Props {
  trees: TreeDTO[];
  onSelect?: (tree: TreeDTO) => void;
  selectedId?: string | null;
}

export function TreeMap({ trees, onSelect, selectedId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [DEFAULT_LNG, DEFAULT_LAT],
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('load', () => setReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    const features = trees.map((t) => ({
      type: 'Feature' as const,
      id: t.id,
      properties: {
        id: t.id,
        risk: t.riskScore ?? null,
        riskLevel: deriveLevel(t.riskScore),
        health: t.healthScore ?? null,
        selected: t.id === selectedId,
      },
      geometry: t.geom,
    }));

    const data = { type: 'FeatureCollection' as const, features };
    const existing = map.getSource('trees') as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(data);
      return;
    }

    map.addSource('trees', { type: 'geojson', data });

    map.addLayer({
      id: 'trees-circles',
      type: 'circle',
      source: 'trees',
      paint: {
        'circle-radius': ['case', ['boolean', ['get', 'selected'], false], 9, 6],
        'circle-color': [
          'match',
          ['get', 'riskLevel'],
          'LOW',
          RISK_COLORS.LOW,
          'MODERATE',
          RISK_COLORS.MODERATE,
          'HIGH',
          RISK_COLORS.HIGH,
          'EXTREME',
          RISK_COLORS.EXTREME,
          UNASSESSED_COLOR,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    });

    map.on('click', 'trees-circles', (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.properties?.id as string;
      const tree = trees.find((t) => t.id === id);
      if (tree && onSelect) onSelect(tree);
    });

    map.on('mouseenter', 'trees-circles', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'trees-circles', () => {
      map.getCanvas().style.cursor = '';
    });
  }, [ready, trees, selectedId, onSelect]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function deriveLevel(score: number | null): RiskLevel | 'UNASSESSED' {
  if (score == null) return 'UNASSESSED';
  if (score >= 80) return 'EXTREME';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MODERATE';
  return 'LOW';
}
