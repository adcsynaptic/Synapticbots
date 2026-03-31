import React from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { useAuthStore } from '../state/auth-store';
import { useThemeTokens } from '../theme/useThemeTokens';
import { AppButton } from '../components/ui/Button';

export function EngineScreen() {
  const clear = useAuthStore((s) => s.clear);
  const { data, isLoading, error } = useQuery({ queryKey: ['engine-status'], queryFn: mobileApi.engineStatus, refetchInterval: 15000 });
  const { colors } = useThemeTokens();
  return (
    <Screen title="Engine Status">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {data ? (
        <>
          <Text style={{ color: colors.text }}>Status: {data.status}</Text>
          {data.snapshot ? (
            <>
              <Text style={{ color: colors.text }}>Cycle: {data.snapshot.cycle}</Text>
              <Text style={{ color: colors.text }}>Coins scanned: {data.snapshot.coinsScanned}</Text>
              <Text style={{ color: colors.text }}>Last analysis: {data.snapshot.lastAnalysisTime ?? '—'}</Text>
              <Text style={{ color: colors.text }}>Next analysis: {data.snapshot.nextAnalysisTime ?? '—'}</Text>
            </>
          ) : null}
        </>
      ) : null}
      <View style={{ marginTop: 16 }}>
        <AppButton title="Logout" onPress={() => void clear()} variant="danger" />
      </View>
    </Screen>
  );
}
