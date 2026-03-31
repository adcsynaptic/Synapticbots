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
      status: 'active',
    },
    orderBy: { entryTime: 'desc' },
  });

  return mobileOk({
    positions: trades.map((t) => ({
      id: t.id,
      symbol: t.coin,
      side: t.position,
      status: t.status,
      entryPrice: t.entryPrice,
      currentPrice: t.currentPrice,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      pnl: t.activePnl,
      openedAt: t.entryTime.toISOString(),
    })),
  });
}

