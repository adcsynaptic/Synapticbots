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
    const raw = Array.isArray(data?.heatmap?.segments) ? data.heatmap.segments : [];
    const segments = raw.map((s: any) => {
      const name = s?.name ?? s?.segment ?? 'SEG';
      const cand = s?.roi_24h ?? s?.change_24h ?? s?.roi ?? s?.delta ?? 0;
      const num = Number(String(cand).toString().replace('%', ''));
      const value = Number.isFinite(num) ? num : 0;
      return { name, value };
    });
    return mobileOk({ segments });
  } catch {
    return mobileOk({ segments: [] });
  }
}

