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
  const positions = sortPositionsByPnl(data?.positions || []);
  const totalPnl = positions.reduce((sum: number, p: any) => sum + Number(p.pnl || 0), 0);

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
});
