import { mobileError, mobileOk } from '@/lib/mobile-response';

export const dynamic = 'force-dynamic';

function normalizeSymbol(input: string | null) {
  const raw = String(input || 'BTCUSDT').toUpperCase().trim();
  const compact = raw.replace(/[^A-Z0-9]/g, '');
  const dePerp = compact.replace(/(PERP|USDTM|USDTPERP|FUTURES)$/g, '');
  if (dePerp.endsWith('USDT')) return dePerp;
  if (dePerp.includes('USDT')) {
    const base = dePerp.split('USDT')[0];
    if (base) return `${base}USDT`;
  }
  return `${dePerp}USDT`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = normalizeSymbol(url.searchParams.get('symbol'));
  const interval = url.searchParams.get('interval') || '5m';
  const limit = Math.max(20, Math.min(500, Number(url.searchParams.get('limit') || 96)));

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return mobileError('UPSTREAM_ERROR', `Binance error ${res.status} for symbol ${symbol}`, 502);
    }
    const raw = (await res.json()) as any[];
    const candles = raw.map((k) => ({
      time: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }));
    return mobileOk({ symbol, interval, candles });
  } catch {
    return mobileError('UPSTREAM_ERROR', 'Failed to fetch candles', 502);
  }
}

