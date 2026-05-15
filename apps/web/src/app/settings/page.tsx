import { Sidebar } from '../../components/Sidebar';

export default function SettingsPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <h1 className="mb-6 text-2xl font-semibold text-canopy-900">Cấu hình</h1>
        <p className="text-sm text-canopy-700">
          Trang cấu hình thuê bao, danh sách người dùng, vai trò và tích hợp đặt ở đây.
        </p>
      </main>
    </div>
  );
}
