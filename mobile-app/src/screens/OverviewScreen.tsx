import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';

export function OverviewScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const nav = useNavigation<any>();
  const { data, isLoading, error } = useQuery({ queryKey: ['overview'], queryFn: mobileApi.overview, refetchInterval: 15000 });

  const stats = data?.stats;
  const wallet = data?.wallet;

  return (
    <Screen title="Overview">
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

          <View style={styles.grid}>
            <StatCard label="Active Bots" value={String(stats.activeBots)} tone={neon.cyan} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Active Trades" value={String(stats.activeTrades)} tone={neon.amber} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total Trades" value={String(stats.totalTrades)} tone={neon.violet} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total PnL" value={formatUsd(stats.totalPnl)} tone={stats.totalPnl >= 0 ? neon.emerald : neon.danger} bg={glassBg} border={glassBorder} text={colors.text} />
          </View>

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
