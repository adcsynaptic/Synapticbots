import { getEngineUrl } from '@/lib/engine-url';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { requireMobileUser } from '@/lib/mobile-request';

export const dynamic = 'force-dynamic';

/** Align mobile engine payload with web `/api/bot-state` so OverviewScreen can read `multi`, `athena`, `state`, `tradebook`. */
function shapeMobileEnginePayload(all: any) {
  const multiRaw = all?.multi || {};
  const coinStates = multiRaw?.coin_states || {};
  const athenaRaw = all?.athena || null;
  const recentDecisions = (athenaRaw?.recent_decisions || []).slice(0, 15);

  const btc = coinStates?.BTCUSDT;
  const regimeStr: string = btc?.regime || '';
  let confidence = 0;
  const matches = regimeStr.match(/\(([\d.]+)\)/g);
  if (matches?.length) {
    const values = matches
      .map((m: string) => parseFloat(m.replace(/[()]/g, '')))
      .filter((v: number) => !isNaN(v) && v > 0 && v <= 1);
    if (values.length > 0) {
      confidence = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length * 100);
    }
  }
  if (confidence === 0) {
    const conviction = btc?.conviction;
    if (conviction != null && conviction > 0) confidence = conviction;
    else {
      const margin = btc?.confidence;
      if (margin != null && margin > 0.05) confidence = Math.round(margin * 100);
    }
  }

  const athena = {
    ...(athenaRaw || { enabled: false }),
    recent_decisions: recentDecisions,
    // OverviewScreen historically expected this name; engine only exposes `recent_decisions`.
    athenaRecentDecisions: recentDecisions,
  };

  const multi = {
    ...multiRaw,
    coin_states: coinStates,
    coins_scanned: Object.keys(coinStates).length,
    eligible_count: Object.values(coinStates).filter((c: any) => String(c?.action || '').includes('ELIGIBLE')).length,
    deployed_count: multiRaw.deployed_count ?? 0,
  };

  const state = {
    regime: multiRaw.macro_regime || btc?.regime || 'WAITING',
    confidence,
    symbol: 'BTCUSDT',
    btc_price: btc?.price ?? null,
    timestamp: multiRaw.last_analysis_time ?? null,
  };

  return {
    multi,
    athena,
    state,
    tradebook: all?.tradebook ?? { trades: [], summary: {} },
    heatmap: all?.heatmap ?? null,
  };
}

/** When engine coin rows omit 24h % (MTF_INSUFFICIENT, vetoes, etc.), fill from public Binance ticker. */
async function enrichCoinStates24h(coinStates: Record<string, any>): Promise<Record<string, any>> {
  const keys = Object.keys(coinStates);
  if (keys.length === 0) return coinStates;

  const need = keys.filter((sym) => {
    const s = coinStates[sym];
    const v = Number(s?.change_24h ?? s?.price_change_24h ?? s?.priceChangePercent);
    return !Number.isFinite(v);
  });
  if (need.length === 0) return coinStates;

  const next = { ...coinStates };
  const keyByUpper = new Map(Object.keys(next).map((k) => [k.toUpperCase(), k]));
  try {
    for (let i = 0; i < need.length; i += 100) {
      const batch = need.slice(i, i + 100).map((s) => s.toUpperCase());
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(batch))}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!res.ok) continue;
      const rows = (await res.json()) as { symbol?: string; priceChangePercent?: string }[];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const u = row.symbol?.toUpperCase();
        const stateKey = u ? keyByUpper.get(u) : undefined;
        if (!stateKey) continue;
        const pct = parseFloat(String(row.priceChangePercent ?? ''));
        if (!Number.isFinite(pct)) continue;
        next[stateKey] = { ...next[stateKey], price_change_24h: pct, change_24h: pct };
      }
    }
    return next;
  } catch {
    return coinStates;
  }
}

export async function GET() {
  const mobileUser = await requireMobileUser();
  if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

  const url = getEngineUrl('live') || getEngineUrl('paper');
  if (!url) {
    return mobileOk({ configured: false, status: 'not_configured' });
  }

  try {
    const secret = process.env.ENGINE_API_SECRET;
    const headers: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};

    const [healthRes, allRes] = await Promise.all([
      fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000), cache: 'no-store', headers }),
      fetch(`${url}/api/all`, { signal: AbortSignal.timeout(8000), cache: 'no-store', headers }),
    ]);

    const health = healthRes.ok ? await healthRes.json() : null;
    const all = allRes.ok ? await allRes.json() : null;

    if (!all) {
      return mobileOk({
        configured: true,
        status: healthRes.ok ? String(health?.status || 'ok') : 'error',
        engine: health,
        checkedAt: new Date().toISOString(),
      });
    }

    let shaped = shapeMobileEnginePayload(all);
    const enriched = await enrichCoinStates24h(shaped.multi?.coin_states || {});
    shaped = {
      ...shaped,
      multi: { ...shaped.multi, coin_states: enriched },
    };
    const multi = shaped.multi;
    const coinStates = multi?.coin_states || {};
    const heatmap = shaped.heatmap;
    const athena = shaped.athena;

    return mobileOk({
      configured: true,
      // Prefer Flask health `status` (running/stopped) so EngineScreen can show live vs stopped.
      status: healthRes.ok ? String(health?.status || 'ok') : 'error',
      engine: health,
      ...shaped,
      snapshot: {
        cycle: multi?.cycle || 0,
        coinsScanned: Object.keys(coinStates).length,
        lastAnalysisTime: multi?.last_analysis_time || null,
        nextAnalysisTime: multi?.next_analysis_time || null,
        analysisIntervalSeconds: multi?.analysis_interval_seconds || null,
        uptimeSeconds: all?.engine?.uptime_seconds ?? health?.uptime_seconds ?? null,
        heatmapSegments: heatmap?.segments?.length || null,
        athenaEnabled: !!athena?.enabled,
        athenaRecentDecisions: (athena?.recent_decisions || []).slice(0, 5),
      },
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return mobileOk({
      configured: true,
      status: 'unreachable',
      checkedAt: new Date().toISOString(),
    });
  }
}

