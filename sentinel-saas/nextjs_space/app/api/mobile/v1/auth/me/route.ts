import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);
  const user = await prisma.user.findUnique({
    where: { id: mobileUser.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return mobileError('UNAUTHORIZED', 'User not found', 401);
  return mobileOk({ user });
}

