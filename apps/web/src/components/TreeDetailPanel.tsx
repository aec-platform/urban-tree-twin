'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { RiskBadge } from './RiskBadge';
import type { TreeDTO } from '@utt/shared';

interface Inspection {
  id: string;
  performedAt: string;
  method: string;
  healthClass: string | null;
  healthScore: number | null;
  notes: string | null;
}

export function TreeDetailPanel({
  tree,
  onClose,
  onAssessRisk,
}: {
  tree: TreeDTO;
  onClose: () => void;
  onAssessRisk: (tree: TreeDTO) => void;
}) {
  const { data: inspections } = useQuery({
    queryKey: ['inspections', tree.id],
    queryFn: () => apiFetch<Inspection[]>(`/v1/inspections?treeId=${tree.id}`),
  });

  return (
    <div className="flex h-full w-96 flex-col border-l border-canopy-100 bg-white">
      <div className="flex items-start justify-between border-b border-canopy-100 px-4 py-3">
        <div>
          <div className="text-sm text-canopy-600">
            {tree.externalCode ?? tree.id.slice(0, 8)}
          </div>
          <div className="text-lg font-semibold text-canopy-900">
            {tree.address ?? 'Cây xanh đô thị'}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <RiskBadge level={deriveLevel(tree.riskScore)} />
            <span className="text-xs text-canopy-600">
              Sức khoẻ: {tree.healthScore?.toFixed(0) ?? '—'} / 100
            </span>
          </div>
        </div>
        <button
          className="rounded p-1 text-canopy-600 hover:bg-canopy-50"
          onClick={onClose}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
        <Field label="Chiều cao" value={tree.heightM ? `${tree.heightM.toFixed(1)} m` : '—'} />
        <Field label="DBH" value={tree.dbhCm ? `${tree.dbhCm.toFixed(0)} cm` : '—'} />
        <Field
          label="Bán kính tán"
          value={tree.canopyRadiusM ? `${tree.canopyRadiusM.toFixed(1)} m` : '—'}
        />
        <Field label="Trạng thái" value={tree.status} />
      </div>

      <div className="border-t border-canopy-100 px-4 py-3">
        <button
          onClick={() => onAssessRisk(tree)}
          className="w-full rounded-md bg-canopy-700 px-3 py-2 text-sm font-medium text-white hover:bg-canopy-800"
        >
          Chạy đánh giá nguy cơ
        </button>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-canopy-100">
        <div className="px-4 py-2 text-sm font-medium text-canopy-700">Lịch sử kiểm tra</div>
        {(inspections ?? []).length === 0 ? (
          <div className="px-4 py-2 text-sm text-canopy-500">Chưa có dữ liệu kiểm tra.</div>
        ) : (
          <ul className="divide-y divide-canopy-100">
            {(inspections ?? []).map((ins) => (
              <li key={ins.id} className="px-4 py-2 text-sm">
                <div className="text-canopy-800">
                  {new Date(ins.performedAt).toLocaleString('vi-VN')} · {ins.method}
                </div>
                <div className="text-canopy-600">
                  {ins.healthClass ?? '—'} · {ins.healthScore?.toFixed(0) ?? '—'}
                </div>
                {ins.notes && <div className="text-xs text-canopy-500">{ins.notes}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-canopy-500">{label}</div>
      <div className="text-canopy-900">{value}</div>
    </div>
  );
}

function deriveLevel(score: number | null) {
  if (score == null) return null;
  if (score >= 80) return 'EXTREME' as const;
  if (score >= 60) return 'HIGH' as const;
  if (score >= 35) return 'MODERATE' as const;
  return 'LOW' as const;
}
