import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd, sortPositionsByPnl } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';

export function PositionsScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['positions'], queryFn: mobileApi.positions, refetchInterval: 15000 });
  const closedPaperQ = useQuery({ queryKey: ['closed-paper-trades'], queryFn: mobileApi.closedPaperTrades, refetchInterval: 15000 });
  const positions = sortPositionsByPnl(data?.positions || []);
  const totalPnl = positions.reduce((sum: number, p: any) => sum + Number(p.pnl || 0), 0);
  const closedPaperTrades = Array.isArray(closedPaperQ.data?.trades) ? closedPaperQ.data.trades : [];

  return (
    <Screen title="Paper Trade" safeTop={false}>
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading open positions...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      <View style={[styles.summary, { backgroundColor: glassBg, borderColor: glassBorder }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Open Positions</Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>{positions.length}</Text>
        <Text style={[styles.summaryPnl, { color: totalPnl >= 0 ? neon.emerald : neon.danger }]}>
          Total Open PnL: {formatUsd(totalPnl)}
        </Text>
      </View>

      {positions.length === 0 && !isLoading ? (
        <View style={[styles.emptyCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <Text style={{ color: colors.textSecondary }}>No active positions right now.</Text>
        </View>
      ) : null}

      {positions.map((p: any) => (
        <View key={p.id} style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.symbol, { color: colors.text }]}>{p.symbol}</Text>
            <Text style={[styles.side, { color: (String(p.side || '').toUpperCase() === 'LONG') ? neon.emerald : neon.danger }]}>
              {String(p.side || '').toUpperCase()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Entry {formatUsd(Number(p.entryPrice || 0))}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Current {formatUsd(Number(p.currentPrice || 0))}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>SL {formatUsd(Number(p.stopLoss || 0))}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>TP {formatUsd(Number(p.takeProfit || 0))}</Text>
          </View>
          <Text style={[styles.pnl, { color: Number(p.pnl || 0) >= 0 ? neon.emerald : neon.danger }]}>
            PnL: {formatUsd(Number(p.pnl || 0))}
          </Text>
        </View>
      ))}

      <View style={[styles.closedSection, { backgroundColor: glassBg, borderColor: glassBorder }]}>
        <Text style={[styles.closedTitle, { color: colors.text }]}>Past Closed Paper Trades</Text>
        {closedPaperQ.isLoading ? (
          <Text style={{ color: colors.textSecondary }}>Loading closed paper trades...</Text>
        ) : closedPaperTrades.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No closed paper trades yet.</Text>
        ) : (
          closedPaperTrades.map((t: any, i: number) => {
            const sym = String(t.symbol || t.coin || '').toUpperCase();
            const side = String(t.position || t.side || '').toUpperCase();
            const pnl = Number(t.totalPnl ?? t.realizedPnl ?? t.pnl ?? 0);
            const status = String(t.status || 'CLOSED').toUpperCase();
            const mode = String(t.engineMode || t.mode || '').toUpperCase();
            const key = `closed-${String(t.id ?? i)}-${sym}-${side}-${status}`;
            return (
              <View key={key} style={styles.closedRow}>
                <Text style={[styles.closedSymbol, { color: colors.text }]}>{sym || '—'}</Text>
                <Text style={[styles.closedSide, { color: side === 'LONG' ? neon.emerald : neon.danger }]}>
                  {side || '—'}
                </Text>
                <Text style={[styles.closedMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {status}
                  {mode ? ` · ${mode}` : ''}
                </Text>
                <Text style={[styles.closedPnl, { color: pnl >= 0 ? neon.emerald : neon.danger }]}>
                  {formatUsd(pnl)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  summaryLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  summaryPnl: { marginTop: 6, fontSize: 13, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  symbol: { fontSize: 16, fontWeight: '800' },
  side: { fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '600' },
  pnl: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  closedSection: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4, gap: 8 },
  closedTitle: { fontSize: 14, fontWeight: '800' },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as any,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  closedSymbol: { fontSize: 12, fontWeight: '800', width: 76 },
  closedSide: { fontSize: 11, fontWeight: '800', width: 54, textAlign: 'right' },
  closedMeta: { fontSize: 10, fontWeight: '600', flex: 1 },
  closedPnl: { fontSize: 12, fontWeight: '800', width: 88, textAlign: 'right' },
});
