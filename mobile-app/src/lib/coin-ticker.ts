/** Resolve a 24h % move from engine `coin_states` (API may add change_24h via Binance merge). */
export function coinTickerPct(s: any): number | null {
  if (!s || typeof s !== 'object') return null;
  const keys = ['price_change_24h', 'priceChangePercent', 'change_24h', 'roi_24h', 'pct_change_24h', 'price_change_percent'];
  for (const k of keys) {
    const raw = (s as Record<string, unknown>)[k];
    if (raw == null || raw === '') continue;
    const v =
      typeof raw === 'string' ? parseFloat(String(raw).trim().replace(/%/g, '')) : Number(raw);
    if (Number.isFinite(v)) return v;
  }
  return null;
}
