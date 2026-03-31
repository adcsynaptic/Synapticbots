import React from 'react';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { sortPositionsByPnl } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';

export function PositionsScreen() {
  const { colors } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['positions'], queryFn: mobileApi.positions, refetchInterval: 15000 });
  const positions = sortPositionsByPnl(data?.positions || []);
  return (
    <Screen title="Positions">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {positions.map((p: any) => (
        <Text key={p.id} style={{ color: colors.text }}>
          {p.symbol} {p.side} PnL: {p.pnl?.toFixed?.(2) ?? p.pnl}
        </Text>
      ))}
    </Screen>
  );
}
