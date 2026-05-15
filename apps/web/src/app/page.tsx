'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { TreeDTO, RiskAssessmentResult, PageResult } from '@utt/shared';
import { apiFetch } from '../lib/api';
import { Sidebar } from '../components/Sidebar';
import { TreeMap } from '../components/TreeMap';
import { TreeDetailPanel } from '../components/TreeDetailPanel';

export default function MapPage() {
  const [selected, setSelected] = useState<TreeDTO | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trees'],
    queryFn: () => apiFetch<PageResult<TreeDTO>>('/v1/trees?limit=500'),
  });

  const assess = useMutation({
    mutationFn: (treeId: string) =>
      apiFetch<RiskAssessmentResult>('/v1/risk/assess', {
        method: 'POST',
        body: JSON.stringify({ treeId }),
      }),
  });

  const trees = data?.items ?? [];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          {isError && (
            <div className="absolute left-4 top-4 z-10 rounded-md bg-white px-3 py-2 text-sm text-risk-extreme shadow">
              Không tải được dữ liệu cây. Kiểm tra kết nối API.
            </div>
          )}
          {isLoading && (
            <div className="absolute left-4 top-4 z-10 rounded-md bg-white px-3 py-2 text-sm text-canopy-700 shadow">
              Đang tải bản đồ…
            </div>
          )}
          <TreeMap
            trees={trees}
            selectedId={selected?.id ?? null}
            onSelect={(t) => setSelected(t)}
          />
          {assess.isPending && (
            <div className="absolute right-4 top-4 z-10 rounded-md bg-white px-3 py-2 text-sm text-canopy-700 shadow">
              Đang chấm điểm nguy cơ…
            </div>
          )}
          {assess.data && (
            <div className="absolute right-4 top-4 z-10 max-w-sm rounded-md bg-white px-3 py-2 text-sm shadow">
              <div className="font-medium">
                Mức nguy cơ: {assess.data.riskLevel} ({assess.data.riskScore.toFixed(0)})
              </div>
              <div className="text-canopy-600">
                Xác suất gãy đổ ước tính:{' '}
                {(assess.data.failureProbability * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
        {selected && (
          <TreeDetailPanel
            tree={selected}
            onClose={() => setSelected(null)}
            onAssessRisk={(t) => assess.mutate(t.id)}
          />
        )}
      </main>
    </div>
  );
}
