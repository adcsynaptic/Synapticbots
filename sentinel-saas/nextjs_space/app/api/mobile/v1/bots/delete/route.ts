import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const mobileUser = await requireMobileUser();
    if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

    const { botId } = await request.json();
    if (!botId) return mobileError('BAD_REQUEST', 'botId required', 400);

    const bot = await prisma.bot.findUnique({ where: { id: botId } });
    if (!bot || bot.userId !== mobileUser.id) return mobileError('NOT_FOUND', 'Bot not found', 404);

    if (bot.isActive) {
      await prisma.bot.update({
        where: { id: botId },
        data: { isActive: false, stoppedAt: new Date() },
      });
    }

    await prisma.botSession.deleteMany({ where: { botId } });
    await prisma.bot.delete({ where: { id: botId } });

    return mobileOk({ success: true });
  } catch (error: any) {
    console.error('Mobile bot deletion error:', error);
    return mobileError('INTERNAL_ERROR', `Failed to delete bot: ${error?.message || 'Unknown error'}`, 500);
  }
}
