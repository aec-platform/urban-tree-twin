'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

export default function RiskPage() {
  const [label, setLabel] = useState('Yagi-class typhoon');
  const [gust, setGust] = useState(45);
  const [sustained, setSustained] = useState(30);
  const [zoneId, setZoneId] = useState('');

  const batch = useMutation({
    mutationFn: () =>
      apiFetch<{ queued: number }>('/v1/risk/batch', {
        method: 'POST',
        body: JSON.stringify({
          zoneId: zoneId || undefined,
          scenario: { label, gustMs: gust, sustainedMs: sustained },
        }),
      }),
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="mb-6 text-2xl font-semibold text-canopy-900">Dự báo nguy cơ</h1>

        <div className="grid max-w-2xl gap-4 rounded-lg border border-canopy-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-canopy-800">Kịch bản gió bão</h2>
          <p className="text-sm text-canopy-600">
            Chạy hàng loạt cho toàn bộ tài sản trước khi cơn bão dự kiến đổ bộ. Mỗi cây sẽ được
            chấm lại điểm nguy cơ với gió giật và gió duy trì bạn nhập dưới đây.
          </p>

          <Field label="Tên kịch bản">
            <input
              className="w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Gió giật (m/s)">
              <input
                type="number"
                className="w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
                value={gust}
                onChange={(e) => setGust(Number(e.target.value))}
              />
            </Field>
            <Field label="Gió duy trì (m/s)">
              <input
                type="number"
                className="w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
                value={sustained}
                onChange={(e) => setSustained(Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="ID khu vực (để trống nếu toàn bộ)">
            <input
              className="w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              placeholder="UUID khu vực"
            />
          </Field>

          <button
            className="rounded-md bg-canopy-700 px-3 py-2 text-sm font-medium text-white hover:bg-canopy-800"
            disabled={batch.isPending}
            onClick={() => batch.mutate()}
          >
            {batch.isPending ? 'Đang xếp hàng…' : 'Chạy đánh giá hàng loạt'}
          </button>

          {batch.data && (
            <div className="rounded-md bg-canopy-50 px-3 py-2 text-sm text-canopy-800">
              Đã xếp hàng {batch.data.queued} cây để đánh giá.
            </div>
          )}
          {batch.isError && (
            <div className="rounded-md bg-risk-extreme/10 px-3 py-2 text-sm text-risk-extreme">
              Lỗi xếp hàng. Kiểm tra Redis / worker.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs uppercase tracking-wide text-canopy-600">{label}</span>
      {children}
    </label>
  );
}
