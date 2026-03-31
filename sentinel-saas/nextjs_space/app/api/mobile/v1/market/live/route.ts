import { mobileError, mobileOk } from '@/lib/mobile-response';
import { requireMobileUser } from '@/lib/mobile-request';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

  try {
    const [tickerRes, fearGreedRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { cache: 'no-store' }),
      fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' }),
    ]);

    const ticker = tickerRes.ok ? await tickerRes.json() : null;
    const fearGreed = fearGreedRes.ok ? await fearGreedRes.json() : null;
    return mobileOk({
      btc: ticker ? { symbol: ticker.symbol, price: Number(ticker.price) } : null,
      fearGreed: fearGreed?.data?.[0] || null,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return mobileError('UPSTREAM_ERROR', 'Failed to fetch market data', 502);
  }
}

