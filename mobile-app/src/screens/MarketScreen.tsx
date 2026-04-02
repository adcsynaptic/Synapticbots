import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { useThemeTokens } from '../theme/useThemeTokens';
import { formatUsd } from '@synaptic/shared';

export function MarketScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['market'], queryFn: mobileApi.market, refetchInterval: 15000 });
  const fearGreed = Number(data?.fearGreed?.value || 0);
  const sentimentColor = fearGreed >= 60 ? neon.emerald : fearGreed >= 40 ? neon.amber : neon.danger;
  const sentimentLabel = fearGreed >= 60 ? 'Greed' : fearGreed >= 40 ? 'Neutral' : 'Fear';

  return (
    <Screen title="Market">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading market feed...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {data ? (
        <View style={styles.stack}>
          <View style={[styles.hero, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>BTC / USDT</Text>
            <Text style={[styles.heroPrice, { color: colors.text }]}>
              {data.btc?.price ? formatUsd(data.btc.price) : 'N/A'}
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Updated: {data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString() : '—'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Market Sentiment</Text>
            <View style={styles.sentimentRow}>
              <Text style={[styles.sentimentScore, { color: sentimentColor }]}>{fearGreed || 'N/A'}</Text>
              <Text style={[styles.sentimentLabel, { color: sentimentColor }]}>{sentimentLabel}</Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, fearGreed))}%`, backgroundColor: sentimentColor }]} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Fear & Greed Index
            </Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 14 },
  heroLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroPrice: { fontSize: 30, fontWeight: '800', marginTop: 4 },
  heroSub: { fontSize: 12, marginTop: 6 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  sentimentRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 as any, marginBottom: 10 },
  sentimentScore: { fontSize: 28, fontWeight: '800' },
  sentimentLabel: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  meta: { marginTop: 8, fontSize: 12 },
});
