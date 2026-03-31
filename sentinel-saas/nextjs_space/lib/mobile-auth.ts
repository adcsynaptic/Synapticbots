import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

function getSecret() {
  return process.env.MOBILE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-mobile-secret';
}

export type MobileClaims = {
  sub: string;
  email: string;
  role?: string | null;
  type: 'access' | 'refresh';
};

export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}

export function signMobileTokens(user: { id: string; email: string; role?: string | null }) {
  const secret = getSecret();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role ?? null, type: 'access' } satisfies MobileClaims,
    secret,
    { expiresIn: ACCESS_TTL }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role ?? null, type: 'refresh' } satisfies MobileClaims,
    secret,
    { expiresIn: REFRESH_TTL }
  );
  return { accessToken, refreshToken };
}

export function verifyMobileToken(token: string, expectedType: 'access' | 'refresh') {
  const secret = getSecret();
  const decoded = jwt.verify(token, secret) as MobileClaims;
  if (decoded.type !== expectedType) {
    throw new Error('Invalid token type');
  }
  return decoded;
}
