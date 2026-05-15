'use client';

import { create } from 'zustand';
import type { SessionUser } from '@utt/shared';
import { apiFetch, setSession } from './api';

interface AuthState {
  session: SessionUser | null;
  setAuth: (data: { session: SessionUser; accessToken: string }) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  setAuth: ({ session, accessToken }) => {
    setSession(accessToken);
    set({ session });
  },
  clear: () => {
    setSession(null);
    set({ session: null });
  },
}));

export async function login(email: string, password: string) {
  const data = await apiFetch<{
    session: SessionUser;
    accessToken: string;
    refreshToken: string;
  }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  useAuth.getState().setAuth(data);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('utt.refreshToken', data.refreshToken);
  }
  return data.session;
}
