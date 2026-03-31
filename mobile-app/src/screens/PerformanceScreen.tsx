import React from 'react';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';

export function PerformanceScreen() {
  const { colors } = useThemeTokens();
  const { data, isLoading, error } = useQuery({ queryKey: ['performance'], queryFn: mobileApi.performance, refetchInterval: 30000 });
  return (
    <Screen title="Performance">
      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}
      {data ? (
        <>
          <Text style={{ color: colors.text }}>All-time trades: {data.summary.allTimeTrades}</Text>
          <Text style={{ color: colors.text }}>All-time PnL: {formatUsd(data.summary.allTimePnl)}</Text>
          <Text style={{ color: colors.text }}>ROI: {Number(data.summary.allTimeRoi || 0).toFixed(2)}%</Text>
        </>
      ) : null}
    </Screen>
  );
}
