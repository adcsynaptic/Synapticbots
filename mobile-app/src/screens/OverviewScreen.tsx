import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';
import { Ticker } from '../components/Ticker';
import { RegimeGauge } from '../components/Gauge';
import React from 'react';

export function OverviewScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const nav = useNavigation<any>();
  const { data, isLoading, error } = useQuery({ queryKey: ['overview'], queryFn: mobileApi.overview, refetchInterval: 15000 });
  const engine = useQuery({ queryKey: ['engine-status'], queryFn: mobileApi.engineStatus, refetchInterval: 15000 });
  const positionsQ = useQuery({ queryKey: ['positions-mini'], queryFn: mobileApi.positions, refetchInterval: 15000 });
  const marketQ = useQuery({ queryKey: ['market-kpis'], queryFn: mobileApi.market, refetchInterval: 15000 });

  const stats = data?.stats;
  const wallet = data?.wallet;
  const engineSnap = engine.data?.snapshot;
  const athena = engine.data?.athena;
  const coinStates = engine.data?.multi?.coin_states || {};
  const segQ = useQuery({ queryKey: ['segments'], queryFn: mobileApi.marketSegments, refetchInterval: 30000 });
  const perBot: Record<string, any> | undefined = engine.data?.perBot;
  const recentTrades: any[] = engine.data?.tradebook?.trades || [];
  const multi = engine.data?.multi || {};
  const [nextSecs, setNextSecs] = React.useState<number | null>(null);

  function colorForDelta(delta: number) {
    const d = Math.max(-15, Math.min(15, Number.isFinite(delta) ? delta : 0));
    if (d >= 0) {
      const t = d / 15;
      return `rgba(16, 185, 129, ${0.35 + 0.45 * t})`;
    } else {
      const t = Math.abs(d) / 15;
      return `rgba(239, 68, 68, ${0.35 + 0.45 * t})`;
    }
  }

  React.useEffect(() => {
    let t: any;
    const update = () => {
      const ts = engineSnap?.nextAnalysisTime;
      if (!ts) { setNextSecs(null); return; }
      const remain = Math.ceil((new Date(ts).getTime() - Date.now()) / 1000);
      setNextSecs(remain);
    };
    update();
    t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [engineSnap?.nextAnalysisTime]);

  const tickerItems = Object.entries(coinStates)
    .slice(0, 12)
    .map(([sym, s]: any) => {
      const pct = Number(s?.change_24h || s?.roi_24h || 0);
      return { label: sym, value: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`, tone: pct >= 0 ? 'up' as const : 'down' as const };
    });

  return (
    <Screen title="Overview">
      <Ticker items={tickerItems} />

      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading dashboard...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}

      {stats ? (
        <View style={styles.stack}>
          <View style={[styles.heroCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Welcome, <Text style={{ color: neon.cyan }}>{data?.user?.name || 'Trader'}</Text>
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              AI trading cockpit is live. Monitor signals, risk, and positions in real-time.
            </Text>
          </View>

          {/* KPI strip */}
          <View style={[styles.kpiRow, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              BTC {marketQ.data?.btc?.price ? `${formatUsd(marketQ.data.btc.price)}` : '—'}
            </Text>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              F/G {marketQ.data?.fearGreed?.value ?? '—'}
            </Text>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              Bots {String(stats.activeBots)}/{String(stats.totalBots)}
            </Text>
          </View>

          <View style={styles.grid}>
            <StatCard label="Active Bots" value={String(stats.activeBots)} tone={neon.cyan} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Active Trades" value={String(stats.activeTrades)} tone={neon.amber} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total Trades" value={String(stats.totalTrades)} tone={neon.violet} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total PnL" value={formatUsd(stats.totalPnl)} tone={stats.totalPnl >= 0 ? neon.emerald : neon.danger} bg={glassBg} border={glassBorder} text={colors.text} />
          </View>

          {/* Engine Snapshot */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Engine Snapshot</Text>
            {engine.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>Loading engine…</Text>
            ) : engine.error ? (
              <Text style={{ color: colors.danger }}>Engine unreachable</Text>
            ) : (
              <>
                <View style={{ alignItems: 'center', marginBottom: 6 }}>
                  <RegimeGauge confidence={Number(engine.data?.state?.confidence || 0)} />
                </View>
                <Row label="Cycle" value={String(engineSnap?.cycle ?? '—')} color={colors.text} />
                <Row label="Coins Scanned" value={String(engineSnap?.coinsScanned ?? '—')} color={colors.text} />
                <Row label="Last Analysis" value={engineSnap?.lastAnalysisTime ?? '—'} color={colors.text} />
                <Row label="Next Analysis" value={engineSnap?.nextAnalysisTime ?? '—'} color={colors.text} />
                <Row label="Countdown" value={nextSecs != null ? `${Math.max(0, nextSecs)}s` : '—'} color={colors.text} />
              </>
            )}
          </View>

          {/* Brain / Execution Summary */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Brain / Execution Summary</Text>
            <Row label="Athena" value={athena?.enabled ? (athena?.model || 'enabled') : 'disabled'} color={colors.text} />
            <Row label="Cycle" value={String(multi?.cycle ?? 0)} color={colors.text} />
            <Row label="Interval" value={`${multi?.analysis_interval_seconds ?? 0}s`} color={colors.text} />
            <Row label="Coins Scanned" value={String(Object.keys(coinStates).length)} color={colors.text} />
            <Row label="Eligible" value={String(multi?.eligible_count ?? 0)} color={colors.text} />
            <Row label="Deployed" value={String(multi?.deployed_count ?? 0)} color={colors.text} />
            {!!athena?.recent_decisions?.length && (
              <Row label="Recent Decisions" value={String(athena.recent_decisions.length)} color={colors.text} />
            )}
          </View>

          {/* Athena Predictions */}
          {athena?.athenaRecentDecisions?.length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Athena Predictions</Text>
              {athena.athenaRecentDecisions.map((d: any, i: number) => (
                <View key={i} style={styles.predRow}>
                  <Text style={[styles.predSymbol, { color: colors.text }]}>{String(d.symbol || '').toUpperCase()}</Text>
                  <Text style={[styles.predSide, { color: (String(d.side || '').toUpperCase() === 'LONG') ? neon.emerald : neon.danger }]}>
                    {String(d.side || '').toUpperCase() || '—'}
                  </Text>
                  <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {d.reason || d.model || ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Active Positions (Top 5) */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Positions</Text>
            {positionsQ.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>Loading positions…</Text>
            ) : positionsQ.error ? (
              <Text style={{ color: colors.danger }}>Failed to load positions</Text>
            ) : (
              (positionsQ.data?.positions || []).slice(0, 5).map((p: any) => (
                <View key={p.id} style={styles.predRow}>
                  <Text style={[styles.predSymbol, { color: colors.text }]}>{String(p.symbol || '').toUpperCase()}</Text>
                  <Text style={[styles.predSide, { color: (String(p.side || '').toUpperCase() === 'LONG') ? neon.emerald : neon.danger }]}>
                    {String(p.side || '').toUpperCase()}
                  </Text>
                  <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    PnL {formatUsd(Number(p.pnl || 0))}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Per-bot Mini Cards */}
          {perBot && Object.keys(perBot).length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bots</Text>
              <View style={styles.botGrid}>
                {Object.entries(perBot).slice(0, 6).map(([botId, b]: any) => (
                  <View key={botId} style={[styles.botCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.botTitle, { color: colors.text }]} numberOfLines={1}>{botId.slice(0, 6)}</Text>
                    <Text style={[styles.botMeta, { color: colors.textSecondary }]}>
                      Active {Number(b.activeTrades || 0)} / Total {Number(b.totalTrades || 0)}
                    </Text>
                    <Text style={[styles.botPnl, { color: Number(b.totalPnl || b.activePnl || 0) >= 0 ? neon.emerald : neon.danger }]}>
                      {formatUsd(Number((b.activePnl ?? 0) + (b.totalPnl ?? 0)))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Segment Heatmap Grid */}
          {Array.isArray(segQ.data?.segments) && segQ.data.segments.length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Segments</Text>
              <View style={styles.heatGrid}>
                {segQ.data.segments.map((s: any, i: number) => {
                  const v = Number(s.roi_24h || s.change_24h || 0);
                  const bg = colorForDelta(v);
                  return (
                    <View key={i} style={[styles.heatCell, { backgroundColor: bg, borderColor: 'rgba(255,255,255,0.06)' }]}>
                      <Text style={[styles.heatName, { color: '#FFFFFF' }]} numberOfLines={1}>
                        {s.name || s.segment || 'SEG'}
                      </Text>
                      <Text style={[styles.heatVal, { color: '#FFFFFF' }]}>{`${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(2)}%`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Market Structure Panel */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Market Structure</Text>
            <View style={styles.msGrid}>
              {['Regime', 'Eligible', 'Deployed', 'Cycle'].map((k) => {
                let value: string | number = '—';
                if (k === 'Regime') value = String(engine.data?.state?.regime || 'WAITING');
                if (k === 'Eligible') value = String(multi?.eligible_count ?? 0);
                if (k === 'Deployed') value = String(multi?.deployed_count ?? 0);
                if (k === 'Cycle') value = String(multi?.cycle ?? 0);
                return (
                  <View key={k} style={[styles.msCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.msTitle, { color: colors.textSecondary }]}>{k}</Text>
                    <Text style={[styles.msValue, { color: colors.text }]}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent Trades */}
          {recentTrades.length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trades</Text>
              {recentTrades.slice(0, 6).map((t: any) => {
                const sym = String(t.symbol || t.coin || '').toUpperCase();
                const side = String(t.position || t.side || '').toUpperCase();
                const isActive = String(t.status || '').toUpperCase() === 'ACTIVE';
                const pnl = Number(isActive ? (t.activePnl || 0) : (t.totalPnl || 0));
                return (
                  <View key={t.id} style={styles.predRow}>
                    <Text style={[styles.predSymbol, { color: colors.text }]}>{sym}</Text>
                    <Text style={[styles.predSide, { color: side === 'LONG' ? neon.emerald : neon.danger }]}>{side || '—'}</Text>
                    <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {isActive ? 'Active' : 'Closed'} · {formatUsd(pnl)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.walletCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet Snapshot</Text>
            <View style={styles.walletRow}>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>Binance</Text>
              <Text style={[styles.walletValue, { color: colors.text }]}>{wallet?.binance == null ? 'Not connected' : formatUsd(wallet.binance)}</Text>
            </View>
            <View style={styles.walletRow}>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>CoinDCX</Text>
              <Text style={[styles.walletValue, { color: colors.text }]}>{wallet?.coindcx == null ? 'Not connected' : formatUsd(wallet.coindcx)}</Text>
            </View>
          </View>

          <View style={[styles.quickActions, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <ActionButton label="Positions" onPress={() => nav.navigate('Positions')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Performance" onPress={() => nav.navigate('Performance')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Market" onPress={() => nav.navigate('Market')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Chart" onPress={() => nav.navigate('Chart')} textColor={colors.text} border={glassBorder} />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tone,
  bg,
  border,
  text,
}: {
  label: string;
  value: string;
  tone: string;
  bg: string;
  border: string;
  text: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.statLabel, { color: tone }]}>{label}</Text>
      <Text style={[styles.statValue, { color: text }]}>{value}</Text>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.rowKV}>
      <Text style={[styles.kvLabel, { color }]}>{label}</Text>
      <Text style={[styles.kvValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  textColor,
  border,
}: {
  label: string;
  onPress: () => void;
  textColor: string;
  border: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, { borderColor: border, opacity: pressed ? 0.8 : 1 }]}>
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  heroCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  heroTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, lineHeight: 19 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800' },

  walletCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 13, fontWeight: '600' },
  walletValue: { fontSize: 13, fontWeight: '700' },

  engineCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  kpiRow: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiText: { fontSize: 12, fontWeight: '700' },
  predRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  predSymbol: { fontSize: 14, fontWeight: '800', width: 72 },
  predSide: { fontSize: 12, fontWeight: '800', width: 54, textAlign: 'right' },
  predMeta: { fontSize: 12, fontWeight: '600', flex: 1 },
  rowKV: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvLabel: { fontSize: 12, fontWeight: '600' },
  kvValue: { fontSize: 12, fontWeight: '700' },

  // Bots mini-cards
  botGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any, marginTop: 6 },
  botCard: { borderWidth: 1, borderRadius: 12, padding: 10, width: '48%' },
  botTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  botMeta: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  botPnl: { fontSize: 14, fontWeight: '800' },

  // Heatmap
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginTop: 6 },
  heatCell: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, width: '48%' },
  heatName: { fontSize: 12, fontWeight: '800' },
  heatVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Market structure tiles
  msGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any, marginTop: 6 },
  msCard: { borderWidth: 1, borderRadius: 12, padding: 12, width: '48%' },
  msTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  msValue: { fontSize: 18, fontWeight: '800' },
  quickActions: { borderWidth: 1, borderRadius: 14, padding: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginTop: 8 },
  actionBtn: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionText: { fontSize: 13, fontWeight: '700' },
});
