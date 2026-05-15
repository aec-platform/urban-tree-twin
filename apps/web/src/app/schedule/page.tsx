'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Sidebar } from '../../components/Sidebar';

interface Task {
  id: string;
  action: string;
  priority: number;
  scheduledFor: string;
  status: string;
  tree: { id: string; externalCode: string | null; address: string | null };
  crew: { name: string } | null;
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiFetch<{ items: Task[] }>('/v1/tasks?limit=200'),
  });

  const autoGen = useMutation({
    mutationFn: () =>
      apiFetch<{ created: number }>('/v1/tasks/auto-generate', {
        method: 'POST',
        body: JSON.stringify({ horizonDays: 30 }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-canopy-900">Lịch cắt tỉa</h1>
          <button
            onClick={() => autoGen.mutate()}
            className="rounded-md bg-canopy-700 px-3 py-2 text-sm font-medium text-white hover:bg-canopy-800"
            disabled={autoGen.isPending}
          >
            {autoGen.isPending ? 'Đang tạo…' : 'Tạo tự động từ cây nguy cơ cao'}
          </button>
        </div>

        <table className="min-w-full divide-y divide-canopy-100 rounded-lg border border-canopy-100 bg-white text-sm">
          <thead className="bg-canopy-50 text-left text-xs uppercase text-canopy-600">
            <tr>
              <th className="px-3 py-2">Cây</th>
              <th className="px-3 py-2">Hành động</th>
              <th className="px-3 py-2">Ưu tiên</th>
              <th className="px-3 py-2">Lịch</th>
              <th className="px-3 py-2">Tổ đội</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canopy-100">
            {(data?.items ?? []).map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2">{t.tree.externalCode ?? t.tree.address ?? t.tree.id.slice(0, 8)}</td>
                <td className="px-3 py-2">{t.action}</td>
                <td className="px-3 py-2">{t.priority}</td>
                <td className="px-3 py-2">{new Date(t.scheduledFor).toLocaleDateString('vi-VN')}</td>
                <td className="px-3 py-2">{t.crew?.name ?? '—'}</td>
                <td className="px-3 py-2">{t.status}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-canopy-600" colSpan={6}>
                  Chưa có công việc nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
