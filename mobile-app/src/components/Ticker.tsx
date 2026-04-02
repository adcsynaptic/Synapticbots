import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../theme/useThemeTokens';

type TickerItem = { label: string; value?: string | number; tone?: 'up' | 'down' | 'neutral' };

export function Ticker({ items }: { items: TickerItem[] }) {
  const { colors, neon } = useThemeTokens();
  return (
    <View style={[styles.container, { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((it, idx) => {
          const toneColor = it.tone === 'up' ? neon.emerald : it.tone === 'down' ? neon.danger : colors.textSecondary;
          return (
            <View key={idx} style={styles.item}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{it.label}</Text>
              {it.value != null ? (
                <Text style={[styles.value, { color: toneColor }]}>{String(it.value)}</Text>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingVertical: 6 },
  row: { paddingHorizontal: 12, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 18, gap: 6 as any },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '800' },
});

