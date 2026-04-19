import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

  const trades = await prisma.trade.findMany({
    where: {
      bot: { userId: mobileUser.id },
      mode: 'paper',
      NOT: { status: 'active' },
    },
    orderBy: [{ exitTime: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
  });

  return mobileOk({
    trades: trades.map((t) => ({
      id: t.id,
      symbol: t.coin,
      side: t.position,
      status: t.status,
      mode: t.mode,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.totalPnl,
      openedAt: t.entryTime?.toISOString() ?? null,
      closedAt: t.exitTime?.toISOString() ?? null,
    })),
  });
}

