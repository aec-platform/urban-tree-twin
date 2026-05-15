import Link from 'next/link';

const items = [
  { href: '/', label: 'Bản đồ', icon: '🗺️' },
  { href: '/dashboard', label: 'Bảng tổng quan', icon: '📊' },
  { href: '/schedule', label: 'Lịch cắt tỉa', icon: '📅' },
  { href: '/risk', label: 'Dự báo nguy cơ', icon: '⚠️' },
  { href: '/settings', label: 'Cấu hình', icon: '⚙️' },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col gap-1 border-r border-canopy-100 bg-white px-3 py-4">
      <div className="mb-6 px-2">
        <div className="text-lg font-semibold text-canopy-800">Urban Tree Twin</div>
        <div className="text-xs text-canopy-600">Hệ thống quản lý cây xanh đô thị</div>
      </div>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-canopy-800 hover:bg-canopy-50"
        >
          <span>{it.icon}</span>
          <span>{it.label}</span>
        </Link>
      ))}
    </aside>
  );
}
