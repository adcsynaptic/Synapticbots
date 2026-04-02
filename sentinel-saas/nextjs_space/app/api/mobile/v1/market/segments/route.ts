import { mobileError, mobileOk } from '@/lib/mobile-response';
import { getEngineUrl } from '@/lib/engine-url';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = getEngineUrl('live') || getEngineUrl('paper');
  if (!url) return mobileOk({ segments: [] });
  try {
    const headers: Record<string, string> = {};
    if (process.env.ENGINE_API_SECRET) headers.Authorization = `Bearer ${process.env.ENGINE_API_SECRET}`;
    const res = await fetch(`${url}/api/all`, { cache: 'no-store', signal: AbortSignal.timeout(7000), headers });
    if (!res.ok) return mobileOk({ segments: [] });
    const data = await res.json();
    const segments = Array.isArray(data?.heatmap?.segments) ? data.heatmap.segments : [];
    return mobileOk({ segments });
  } catch {
    return mobileOk({ segments: [] });
  }
}

