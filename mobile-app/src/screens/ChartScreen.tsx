import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';
import { neon } from '../theme/web-tokens';

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type Position = {
  id: string;
  symbol: string;
  side: string;
  status: string;
  entryPrice: number;
  currentPrice: number | null;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  openedAt: string;
};

type Timeframe = { label: string; interval: string; limit: number };
const TIMEFRAMES: Timeframe[] = [
  { label: '1m', interval: '1m', limit: 60 },
  { label: '5m', interval: '5m', limit: 96 },
  { label: '15m', interval: '15m', limit: 96 },
  { label: '1h', interval: '1h', limit: 96 },
  { label: '4h', interval: '4h', limit: 96 },
  { label: '1d', interval: '1d', limit: 90 },
];

function toUsdtSymbol(symbol: string) {
  const s = (symbol || '').toUpperCase();
  return s.endsWith('USDT') ? s : `${s}USDT`;
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const sym = toUsdtSymbol(symbol);
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance error ${res.status}`);
  const raw: any[] = await res.json();
  return raw.map((k) => ({
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  }));
}

export function ChartScreen() {
  const width = Dimensions.get('window').width;
  const chartH = 280;
  const { colors, borderSubtle, neon: _neon } = useThemeTokens();
  void _neon; // keeps the hook usage stable

  const { data, isLoading, error } = useQuery({
    queryKey: ['positions_for_chart'],
    queryFn: mobileApi.positions,
    refetchInterval: 20000,
  });

  const positions: Position[] = data?.positions || [];
  const uniqueSymbols = useMemo(() => {
    const m = new Map<string, Position>();
    for (const p of positions) {
      const key = String(p.symbol || '').toUpperCase();
      if (!key) continue;
      if (!m.has(key)) m.set(key, p);
    }
    return Array.from(m.values());
  }, [positions]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => uniqueSymbols[0]?.symbol || 'BTCUSDT');
  const [tf, setTf] = useState<string>('5m');

  // Keep selection valid if the backend data changes.
  useEffect(() => {
    if (!uniqueSymbols.length) return;
    const exists = uniqueSymbols.some((p) => (p.symbol || '').toUpperCase() === selectedSymbol.toUpperCase());
    if (!exists) setSelectedSymbol(uniqueSymbols[0].symbol);
  }, [uniqueSymbols, selectedSymbol]);

  const currentLevels = useMemo(() => {
    const p = positions.find((x) => (x.symbol || '').toUpperCase() === selectedSymbol.toUpperCase()) || positions[0];
    return p
      ? { entry: p.entryPrice, sl: p.stopLoss, tp: p.takeProfit, side: p.side }
      : { entry: 0, sl: 0, tp: 0, side: 'LONG' };
  }, [positions, selectedSymbol]);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string>('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChangePct, setPriceChangePct] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tfConfig = TIMEFRAMES.find((t) => t.interval === tf) || TIMEFRAMES[1];

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!selectedSymbol) return;
      setChartLoading(true);
      setChartError('');
      try {
        const data = await fetchKlines(selectedSymbol, tfConfig.interval, tfConfig.limit);
        if (!alive) return;
        setCandles(data);
        const last = data[data.length - 1];
        const first = data[0];
        setCurrentPrice(last?.close ?? null);
        if (first?.open && first.open !== 0) {
          setPriceChangePct(((last.close - first.open) / first.open) * 100);
        } else {
          setPriceChangePct(0);
        }
      } catch (e: any) {
        if (!alive) return;
        setChartError(e?.message || 'Failed to load chart data');
      } finally {
        if (!alive) return;
        setChartLoading(false);
      }
    }

    void load();

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      void (async () => {
        try {
          const data = await fetchKlines(selectedSymbol, tfConfig.interval, tfConfig.limit);
          setCandles(data);
          const last = data[data.length - 1];
          setCurrentPrice(last?.close ?? null);
        } catch {
          // silent refresh failure
        }
      })();
    }, 10000);

    return () => {
      alive = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedSymbol, tfConfig.interval, tfConfig.limit]);

  const candlesToRender = candles.slice(-tfConfig.limit);

  const { yMin, yMax } = useMemo(() => {
    if (!candlesToRender.length) return { yMin: 0, yMax: 1 };
    let min = Math.min(...candlesToRender.map((c) => c.low));
    let max = Math.max(...candlesToRender.map((c) => c.high));
    if (currentLevels.entry > 0) {
      min = Math.min(min, currentLevels.entry);
      max = Math.max(max, currentLevels.entry);
    }
    if (currentLevels.sl > 0) {
      min = Math.min(min, currentLevels.sl);
      max = Math.max(max, currentLevels.sl);
    }
    if (currentLevels.tp > 0) {
      min = Math.min(min, currentLevels.tp);
      max = Math.max(max, currentLevels.tp);
    }
    const pad = (max - min) * 0.1 || 1;
    return { yMin: min - pad, yMax: max + pad };
  }, [candlesToRender, currentLevels.entry, currentLevels.sl, currentLevels.tp]);

  const padL = 10;
  const padR = 10;
  const padT = 10;
  const padB = 30;
  const chartW = Math.max(1, width - padL - padR);
  const chartInnerH = chartH - padT - padB;
  const candleW = candlesToRender.length ? Math.max(1, chartW / candlesToRender.length) : 1;

  const toX = (i: number) => padL + i * candleW + candleW / 2;
  const toY = (price: number) => {
    const t = (price - yMin) / (yMax - yMin || 1);
    return padT + (1 - t) * chartInnerH;
  };

  const last = candlesToRender[candlesToRender.length - 1];
  const isUp = priceChangePct >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {toUsdtSymbol(selectedSymbol).replace('USDT', '')}/USDT
        </Text>
        <View style={styles.statsRow}>
          <Text style={[styles.priceText, { color: colors.text }]}>
            {currentPrice != null ? formatUsd(currentPrice).replace('$', '$') : 'N/A'}
          </Text>
          <Text style={[styles.pctText, { color: isUp ? neon.emerald : neon.danger }]}>
            {priceChangePct ? `${isUp ? '▲' : '▼'} ${Math.abs(priceChangePct).toFixed(2)}%` : '—'}
          </Text>
        </View>
        <View style={styles.tfRow}>
          {TIMEFRAMES.map((t) => (
            <Pressable
              key={t.interval}
              onPress={() => setTf(t.interval)}
              style={[styles.tfBtn, tf === t.interval && styles.tfBtnActive]}
            >
              <Text style={[styles.tfBtnText, tf === t.interval && styles.tfBtnTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.coinRow}>
        {uniqueSymbols.slice(0, 8).map((p) => {
          const isSel = p.symbol.toUpperCase() === selectedSymbol.toUpperCase();
          const tick = toUsdtSymbol(p.symbol).replace('USDT', '');
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelectedSymbol(p.symbol)}
              style={[styles.coinPill, isSel && styles.coinPillActive]}
            >
              <Text style={[styles.coinPillText, { color: colors.textSecondary }, isSel && styles.coinPillTextActive]}>
                {tick}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chartBox}>
        {(isLoading || chartLoading) && <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading chart…</Text>}
        {error && <Text style={[styles.errorText, { color: colors.danger }]}>{String((error as Error).message)}</Text>}
        {chartError ? <Text style={[styles.errorText, { color: colors.danger }]}>{chartError}</Text> : null}

        {!chartError && !chartLoading ? (
          <Svg width={width} height={chartH}>
            <G>
              {/* Horizontal level lines */}
              {currentLevels.entry > 0 ? (
                <Line x1={0} y1={toY(currentLevels.entry)} x2={width} y2={toY(currentLevels.entry)} stroke={neon.cyan} strokeDasharray="4,4" />
              ) : null}
              {currentLevels.sl > 0 ? (
                <Line x1={0} y1={toY(currentLevels.sl)} x2={width} y2={toY(currentLevels.sl)} stroke={neon.danger} strokeDasharray="4,4" />
              ) : null}
              {currentLevels.tp > 0 ? (
                <Line x1={0} y1={toY(currentLevels.tp)} x2={width} y2={toY(currentLevels.tp)} stroke={neon.emerald} strokeDasharray="4,4" />
              ) : null}

              {/* Candles */}
              {candlesToRender.map((c, i) => {
                const x = toX(i);
                const yOpen = toY(c.open);
                const yClose = toY(c.close);
                const yHigh = toY(c.high);
                const yLow = toY(c.low);

                const bullish = c.close >= c.open;
                const fill = bullish ? '#22C55E' : '#EF4444';

                const bodyTop = Math.min(yOpen, yClose);
                const bodyBottom = Math.max(yOpen, yClose);
                const bodyH = Math.max(1, bodyBottom - bodyTop);

                return (
                  <G key={c.time}>
                    <Line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={fill} strokeWidth={1} opacity={0.8} />
                    <Rect x={x - candleW * 0.4} y={bodyTop} width={candleW * 0.8} height={bodyH} fill={fill} opacity={0.9} rx={1} />
                  </G>
                );
              })}

              {/* X labels */}
              {candlesToRender.length > 0
                ? [0, Math.floor(candlesToRender.length / 2), candlesToRender.length - 1].map((idx) => {
                    const c = candlesToRender[idx];
                    if (!c) return null;
                    const d = new Date(c.time);
                    const label =
                      tfConfig.interval === '1d'
                        ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    return <SvgText key={idx} x={toX(idx)} y={chartH - 12} fontSize={10} fill="#6B7280" textAnchor="middle">{label}</SvgText>;
                  })
                : null}

              {/* Current price label */}
              {last?.close != null ? (
                <SvgText x={width - 10} y={toY(last.close) - 4} fontSize={10} fill={neon.amber} textAnchor="end">
                  C: {last.close.toFixed(4)}
                </SvgText>
              ) : null}
            </G>
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  title: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceText: { color: 'white', fontWeight: '700' },
  pctText: { fontWeight: '800' },
  tfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tfBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)' },
  tfBtnActive: { backgroundColor: 'rgba(245,158,11,0.20)' },
  tfBtnText: { color: '#6B7280', fontWeight: '700' },
  tfBtnTextActive: { color: '#F59E0B' },
  coinRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  coinPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' },
  coinPillActive: { borderColor: 'rgba(0,229,255,0.4)', backgroundColor: 'rgba(0,229,255,0.10)' },
  coinPillText: { color: '#6B7280', fontWeight: '800' },
  coinPillTextActive: { color: '#00E5FF' },
  chartBox: { padding: 16, justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { color: '#9CA3AF', fontWeight: '700' },
  errorText: { color: '#EF4444', fontWeight: '700', marginBottom: 8 },
});

