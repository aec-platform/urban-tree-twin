'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';
import { RiskBadge } from '../../components/RiskBadge';

type Summary = Record<'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'UNASSESSED', number>;

export default function DashboardPage() {
  const { data } = useQuery({
    queryKey: ['risk-summary'],
    queryFn: () => apiFetch<Summary>('/v1/risk/summary'),
  });

  const total = data ? Object.values(data).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="mb-6 text-2xl font-semibold text-canopy-900">Bảng tổng quan</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card label="Tổng số cây" value={total} />
          <Card label="Thấp" value={data?.LOW ?? 0} pillLevel="LOW" />
          <Card label="Trung bình" value={data?.MODERATE ?? 0} pillLevel="MODERATE" />
          <Card label="Cao" value={data?.HIGH ?? 0} pillLevel="HIGH" />
          <Card label="Cực cao" value={data?.EXTREME ?? 0} pillLevel="EXTREME" />
        </div>

        <p className="mt-8 text-sm text-canopy-700">
          Số cây chưa được đánh giá: <strong>{data?.UNASSESSED ?? 0}</strong>. Chạy{' '}
          <code className="rounded bg-canopy-100 px-1">POST /v1/risk/batch</code> để xếp hàng đánh
          giá toàn bộ trước khi bão đến.
        </p>
      </main>
    </div>
  );
}

function Card({
  label,
  value,
  pillLevel,
}: {
  label: string;
  value: number;
  pillLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}) {
  return (
    <div className="rounded-lg border border-canopy-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-canopy-600">{label}</div>
        {pillLevel && <RiskBadge level={pillLevel} />}
      </div>
      <div className="mt-2 text-3xl font-semibold text-canopy-900">{value}</div>
    </div>
  );
}
