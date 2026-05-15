'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canopy-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-lg border border-canopy-100 bg-white p-6 shadow"
      >
        <h1 className="mb-1 text-xl font-semibold text-canopy-900">Đăng nhập</h1>
        <p className="mb-4 text-sm text-canopy-600">Urban Tree Twin</p>

        <label className="mb-3 block text-sm">
          <span className="text-canopy-700">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mb-4 block text-sm">
          <span className="text-canopy-700">Mật khẩu</span>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-canopy-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && (
          <div className="mb-3 rounded-md bg-risk-extreme/10 px-3 py-2 text-sm text-risk-extreme">
            {error}
          </div>
        )}

        <button
          className="w-full rounded-md bg-canopy-700 px-3 py-2 text-sm font-medium text-white hover:bg-canopy-800"
          disabled={busy}
        >
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
