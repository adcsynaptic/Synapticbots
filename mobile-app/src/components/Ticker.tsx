import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../theme/useThemeTokens';

type TickerItem = { label: string; value?: string | number; tone?: 'up' | 'down' | 'neutral' };

export function Ticker({ items }: { items: TickerItem[] }) {
  const { colors, neon } = useThemeTokens();
  const translateX = useRef(new Animated.Value(0)).current;
  const [chunkW, setChunkW] = useState(0);
  const [trackW, setTrackW] = useState(0);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const shouldMarquee = items.length > 0 && chunkW > 0 && trackW > 0 && chunkW > trackW + 1;

  useEffect(() => {
    loopRef.current?.stop();
    translateX.setValue(0);
    if (!shouldMarquee) return;

    const duration = Math.max(14000, Math.round(chunkW * 38));
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: -chunkW,
        duration,
        useNativeDriver: true,
      })
    );
    loopRef.current = anim;
    anim.start();
    return () => {
      anim.stop();
    };
  }, [shouldMarquee, chunkW, translateX]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackW(e.nativeEvent.layout.width);
  };

  const onChunkLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - chunkW) > 0.5) setChunkW(w);
  };

  const renderItems = (keyPrefix: string) =>
    items.map((it, idx) => {
      const toneColor = it.tone === 'up' ? neon.emerald : it.tone === 'down' ? neon.danger : colors.textSecondary;
      return (
        <View key={`${keyPrefix}-${it.label}-${idx}`} style={styles.item}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{it.label}</Text>
          {it.value != null ? <Text style={[styles.value, { color: toneColor }]}>{String(it.value)}</Text> : null}
        </View>
      );
    });

  if (items.length === 0) return null;

  return (
    <View style={[styles.container, { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }]} onLayout={onTrackLayout}>
      {shouldMarquee ? (
        <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
          <View style={styles.chunk} onLayout={onChunkLayout}>
            {renderItems('a')}
          </View>
          <View style={styles.chunk}>{renderItems('b')}</View>
        </Animated.View>
      ) : (
        <View style={[styles.track, styles.staticRow]} onLayout={onChunkLayout}>
          {renderItems('s')}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingVertical: 6, overflow: 'hidden' },
  track: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  staticRow: { paddingHorizontal: 12 },
  chunk: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingHorizontal: 12 },
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 18, gap: 6 as any },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '800' },
});
