import React from 'react';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { useThemeTokens } from '../theme/useThemeTokens';

export function MarketScreen() {
  const { colors } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['market'], queryFn: mobileApi.market, refetchInterval: 15000 });
  return (
    <Screen title="Market">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {data ? (
        <>
          <Text style={{ color: colors.text }}>BTC: {data.btc?.price ?? 'N/A'}</Text>
          <Text style={{ color: colors.text }}>Fear/Greed: {data.fearGreed?.value ?? 'N/A'}</Text>
        </>
      ) : null}
    </Screen>
  );
}
