import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../state/auth-store';
import { useThemeTokens } from '../theme/useThemeTokens';
import { AppButton } from '../components/ui/Button';

export function EngineScreen() {
  const clear = useAuthStore((s) => s.clear);
  const { data, isLoading, error } = useQuery({ queryKey: ['engine-status'], queryFn: mobileApi.engineStatus, refetchInterval: 15000 });
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const engineHealth = data?.engine as { status?: string } | undefined;
  const online =
    String(engineHealth?.status || '').toLowerCase() === 'running' ||
    ['ok', 'active'].includes(String(data?.status || '').toLowerCase());

  return (
    <Screen title="Engine Status" safeTop={false}>
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading engine state...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {data ? (
        <View style={styles.stack}>
          <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Engine</Text>
            <Text style={[styles.status, { color: online ? neon.emerald : neon.danger }]}>
              {String(data.status || 'unknown').toUpperCase()}
            </Text>
          </View>
          {data.snapshot ? (
            <View style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <View style={styles.row}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Cycle</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{String(data.snapshot.cycle ?? '—')}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Coins Scanned</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{String(data.snapshot.coinsScanned ?? '—')}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Last Analysis</Text>
                <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                  {data.snapshot.lastAnalysisTime ? new Date(data.snapshot.lastAnalysisTime).toLocaleTimeString() : '—'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Next Analysis</Text>
                <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                  {data.snapshot.nextAnalysisTime ? new Date(data.snapshot.nextAnalysisTime).toLocaleTimeString() : '—'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.logout}>
        <AppButton title="Logout" onPress={() => void clear()} variant="danger" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  status: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  metaLabel: { fontSize: 12, fontWeight: '600' },
  metaValue: { fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  logout: { marginTop: 16 },
});
