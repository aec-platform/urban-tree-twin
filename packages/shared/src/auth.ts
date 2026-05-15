import { z } from 'zod';
import { UserRole } from './enums.js';

export const LoginInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const SignupInput = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(200),
  fullName: z.string().min(1).max(120),
  tenantName: z.string().min(2).max(120),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const InviteUserInput = z.object({
  email: z.string().email().max(254),
  fullName: z.string().min(1).max(120),
  role: UserRole.default('VIEWER'),
});
export type InviteUserInput = z.infer<typeof InviteUserInput>;

export const RefreshInput = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshInput = z.infer<typeof RefreshInput>;

export const SessionUser = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: UserRole,
});
export type SessionUser = z.infer<typeof SessionUser>;
