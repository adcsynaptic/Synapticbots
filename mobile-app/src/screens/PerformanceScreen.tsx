import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';

export function PerformanceScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['performance'], queryFn: mobileApi.performance, refetchInterval: 30000 });
  const summary = data?.summary;
  const roi = Number(summary?.allTimeRoi || 0);
  const pnl = Number(summary?.allTimePnl || 0);

  return (
    <Screen title="Performance">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading performance...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {summary ? (
        <View style={styles.stack}>
          <View style={[styles.hero, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>All-Time PnL</Text>
            <Text style={[styles.heroValue, { color: pnl >= 0 ? neon.emerald : neon.danger }]}>{formatUsd(pnl)}</Text>
          </View>

          <View style={styles.grid}>
            <MetricCard
              label="All-Time Trades"
              value={String(summary.allTimeTrades)}
              bg={glassBg}
              border={glassBorder}
              valueColor={colors.text}
              labelColor={colors.textSecondary}
            />
            <MetricCard
              label="ROI"
              value={`${roi.toFixed(2)}%`}
              bg={glassBg}
              border={glassBorder}
              valueColor={roi >= 0 ? neon.emerald : neon.danger}
              labelColor={colors.textSecondary}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function MetricCard({
  label,
  value,
  bg,
  border,
  valueColor,
  labelColor,
}: {
  label: string;
  value: string;
  bg: string;
  border: string;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.metricLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 14 },
  heroLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroValue: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  grid: { flexDirection: 'row', gap: 10 as any },
  metric: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12 },
  metricLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  metricValue: { fontSize: 18, fontWeight: '800' },
});
