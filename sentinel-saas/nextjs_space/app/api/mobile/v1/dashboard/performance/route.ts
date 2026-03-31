import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

  const trades = await prisma.trade.findMany({
    where: { bot: { userId: mobileUser.id } },
    select: { status: true, totalPnl: true, activePnl: true, capital: true },
  });

  const closed = trades.filter((t) => (t.status || '').toLowerCase() === 'closed');
  const active = trades.filter((t) => (t.status || '').toLowerCase() === 'active');

  const realized = closed.reduce((sum, t) => sum + (t.totalPnl || 0), 0);
  const unrealized = active.reduce((sum, t) => sum + (t.activePnl || 0), 0);
  const capital = trades.reduce((sum, t) => sum + (t.capital || 0), 0);
  const allTimePnl = realized + unrealized;

  return mobileOk({
    summary: {
      allTimePnl,
      allTimeTrades: trades.length,
      allTimeRoi: capital > 0 ? (allTimePnl / capital) * 100 : 0,
    },
  });
}

