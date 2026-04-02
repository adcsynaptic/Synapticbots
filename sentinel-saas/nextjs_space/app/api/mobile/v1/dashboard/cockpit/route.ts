import { mobileOk } from '@/lib/mobile-response';
import { getEngineUrl } from '@/lib/engine-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = getEngineUrl('live') || getEngineUrl('paper');
  if (!url) {
    return mobileOk({
      scanned: 0,
      inPool: 0,
      qualified: 0,
      queued: 0,
      signalQueue: [],
      segments: [],
      perBot: {},
      recentTrades: [],
    });
  }
  try {
    const headers: Record<string, string> = {};
    if (process.env.ENGINE_API_SECRET) headers.Authorization = `Bearer ${process.env.ENGINE_API_SECRET}`;
    const res = await fetch(`${url}/api/all`, { cache: 'no-store', signal: AbortSignal.timeout(7000), headers });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();

    const coinStates = data?.multi?.coin_states || {};
    const scanned = Object.keys(coinStates).length;
    const inPool = Number(data?.multi?.coins_scanned ?? scanned);
    const qualified = Number(data?.multi?.eligible_count ?? 0);

    const athenaDecisions = data?.athena?.recent_decisions || [];
    const signalQueue = (Array.isArray(athenaDecisions) ? athenaDecisions : []).map((d: any) => ({
      symbol: String(d.symbol || '').toUpperCase(),
      side: String(d.side || d.position || '').toUpperCase(),
      confidence: d.conviction != null ? Number(d.conviction) * 100 : (d.confidence != null ? Number(d.confidence) : null),
      ttl: d.ttl || null,
    }));
    const queued = signalQueue.length;

    const segRaw = Array.isArray(data?.heatmap?.segments) ? data.heatmap.segments : [];
    const segments = segRaw.map((s: any) => {
      const name = s?.name ?? s?.segment ?? 'SEG';
      const num = Number(String(s?.roi_24h ?? s?.change_24h ?? s?.roi ?? s?.delta ?? 0).toString().replace('%', ''));
      return { name, value: Number.isFinite(num) ? num : 0 };
    });

    const perBotArr: any[] = data?.perBot ? Object.entries(data.perBot) : [];
    const perBot = Object.fromEntries(
      perBotArr.map(([botId, b]: any) => [
        botId,
        {
          activeTrades: Number(b?.activeTrades ?? 0),
          totalTrades: Number(b?.totalTrades ?? 0),
          activePnl: Number(b?.activePnl ?? 0),
          totalPnl: Number(b?.totalPnl ?? 0),
          capital: Number(b?.capital ?? 0),
        },
      ])
    );

    const recentTrades = (data?.tradebook?.trades || []).slice(0, 20).map((t: any) => ({
      id: t.id,
      symbol: String(t.symbol || t.coin || '').toUpperCase(),
      side: String(t.position || t.side || '').toUpperCase(),
      status: String(t.status || '').toUpperCase(),
      pnl: Number(String(t.status || '').toUpperCase() === 'ACTIVE' ? (t.activePnl || 0) : (t.totalPnl || 0)),
      entryPrice: t.entryPrice ?? t.entry_price ?? null,
      exitPrice: t.exitPrice ?? t.exit_price ?? null,
      roi: t.totalPnlPercent ?? t.total_pnl_percent ?? null,
    }));

    return mobileOk({
      scanned,
      inPool,
      qualified,
      queued,
      signalQueue,
      segments,
      perBot,
      recentTrades,
    });
  } catch {
    return mobileOk({
      scanned: 0,
      inPool: 0,
      qualified: 0,
      queued: 0,
      signalQueue: [],
      segments: [],
      perBot: {},
      recentTrades: [],
    });
  }
}

