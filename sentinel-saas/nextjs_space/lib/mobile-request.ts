import { headers } from 'next/headers';
import { verifyMobileToken } from '@/lib/mobile-auth';

export async function requireMobileUser() {
  const h = await headers();
  const auth = h.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const claims = verifyMobileToken(token, 'access');
    return { id: claims.sub, email: claims.email, role: claims.role ?? null };
  } catch {
    return null;
  }
}

