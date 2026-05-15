import argon2 from 'argon2';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import type { SessionUser, LoginInput, SignupInput, UserRole } from '@utt/shared';

const pepperedHash = (raw: string) =>
  argon2.hash(raw + config.PASSWORD_PEPPER, { type: argon2.argon2id });

const pepperedVerify = (hash: string, raw: string) =>
  argon2.verify(hash, raw + config.PASSWORD_PEPPER);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export async function signup(input: SignupInput): Promise<SessionUser> {
  const existing = await prisma.user.findFirst({ where: { email: input.email } });
  if (existing) throw conflict('Email already in use');

  let slug = slugify(input.tenantName) || `tenant-${crypto.randomBytes(3).toString('hex')}`;
  let attempt = 0;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${slugify(input.tenantName)}-${attempt}`;
    if (attempt > 50) throw badRequest('Could not allocate tenant slug');
  }

  const tenant = await prisma.tenant.create({
    data: { name: input.tenantName, slug, plan: 'trial' },
  });
  const passwordHash = await pepperedHash(input.password);

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      role: 'OWNER',
    },
  });

  return {
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    role: user.role as UserRole,
  };
}

export async function login(input: LoginInput, meta: { ip?: string; ua?: string }) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, isActive: true },
  });
  if (!user) throw unauthorized('Invalid credentials');

  const ok = await pepperedVerify(user.passwordHash, input.password);
  if (!ok) throw unauthorized('Invalid credentials');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const session: SessionUser = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role as UserRole,
  };

  const refreshTokenRaw = crypto.randomBytes(48).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + config.JWT_REFRESH_TTL * 1000),
      ipAddress: meta.ip ?? null,
      userAgent: meta.ua ?? null,
    },
  });

  return { session, refreshTokenRaw };
}

export async function rotateRefresh(token: string, meta: { ip?: string; ua?: string }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw unauthorized('Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || !user.isActive) throw unauthorized('User no longer active');

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const newRaw = crypto.randomBytes(48).toString('base64url');
  const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + config.JWT_REFRESH_TTL * 1000),
      ipAddress: meta.ip ?? null,
      userAgent: meta.ua ?? null,
    },
  });

  const session: SessionUser = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role as UserRole,
  };
  return { session, refreshTokenRaw: newRaw };
}

export async function revokeRefresh(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.refreshToken
    .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
    .catch(() => null);
}
