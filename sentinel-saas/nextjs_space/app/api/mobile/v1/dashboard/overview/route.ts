import prisma from '@/lib/prisma';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { requireMobileUser } from '@/lib/mobile-request';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

  const user = await prisma.user.findUnique({
    where: { id: mobileUser.id },
    include: {
      bots: { select: { id: true, isActive: true } },
      trades: {
        orderBy: { entryTime: 'desc' },
        take: 100,
      },
    },
  });
  if (!user) return mobileError('UNAUTHORIZED', 'User not found', 401);

  const activeTrades = user.trades.filter((t) => (t.status || '').toLowerCase() === 'active');
  const closedTrades = user.trades.filter((t) => (t.status || '').toLowerCase() === 'closed');
  const totalPnl =
    closedTrades.reduce((sum, t) => sum + (t.totalPnl || 0), 0) +
    activeTrades.reduce((sum, t) => sum + (t.activePnl || 0), 0);

  return mobileOk({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    stats: {
      activeBots: user.bots.filter((b) => b.isActive).length,
      totalBots: user.bots.length,
      activeTrades: activeTrades.length,
      totalTrades: user.trades.length,
      totalPnl,
    },
    wallet: {
      binance: null,
      coindcx: null,
    },
    updatedAt: new Date().toISOString(),
  });
}

