import React from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileApi } from '../lib/api';
import { useThemeTokens } from '../theme/useThemeTokens';
import { Ticker } from './Ticker';
import { coinTickerPct } from '../lib/coin-ticker';

const EMPTY: Record<string, unknown> = {};

export function CoinsTickerBar() {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeTokens();
  const engine = useQuery({ queryKey: ['engine-status'], queryFn: mobileApi.engineStatus, refetchInterval: 15000 });
  const coinStates = engine.data?.multi?.coin_states ?? EMPTY;

  const items = React.useMemo(() => {
    return Object.entries(coinStates)
      .slice(0, 16)
      .map(([sym, s]: [string, any]) => {
        const pct = coinTickerPct(s);
        if (pct == null) {
          return { label: sym, value: '—', tone: 'neutral' as const };
        }
        return {
          label: sym,
          value: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}%`,
          tone: pct >= 0 ? ('up' as const) : ('down' as const),
        };
      });
  }, [coinStates]);

  if (items.length === 0) return null;

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.background }}>
      <Ticker items={items} />
    </View>
  );
}
