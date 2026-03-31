import { z } from 'zod';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { signMobileTokens, verifyMobileToken } from '@/lib/mobile-auth';
import prisma from '@/lib/prisma';

const bodySchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const claims = verifyMobileToken(body.refreshToken, 'refresh');
    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user) return mobileError('UNAUTHORIZED', 'User not found', 401);
    const tokens = signMobileTokens({ id: user.id, email: user.email, role: user.role });
    return mobileOk(tokens);
  } catch {
    return mobileError('UNAUTHORIZED', 'Invalid refresh token', 401);
  }
}

