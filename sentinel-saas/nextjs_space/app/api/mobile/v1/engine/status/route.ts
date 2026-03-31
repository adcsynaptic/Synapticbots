import { getEngineUrl } from '@/lib/engine-url';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { requireMobileUser } from '@/lib/mobile-request';

export const dynamic = 'force-dynamic';

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

    const multi = all?.multi || {};
    const coinStates = multi?.coin_states || {};
    const heatmap = all?.heatmap || null;
    const athena = all?.athena || null;

    return mobileOk({
      configured: true,
      status: healthRes.ok ? 'ok' : 'error',
      engine: health,
      snapshot: {
        cycle: multi?.cycle || 0,
        coinsScanned: Object.keys(coinStates).length,
        lastAnalysisTime: multi?.last_analysis_time || null,
        nextAnalysisTime: multi?.next_analysis_time || null,
        analysisIntervalSeconds: multi?.analysis_interval_seconds || null,
        uptimeSeconds: all?.engine?.uptime_seconds || null,
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

