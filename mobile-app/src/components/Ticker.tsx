import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../theme/useThemeTokens';

type TickerItem = { label: string; value?: string | number; tone?: 'up' | 'down' | 'neutral' };

export function Ticker({ items }: { items: TickerItem[] }) {
  const { colors, neon } = useThemeTokens();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const [viewportW, setViewportW] = useState(0);
  const [stripW, setStripW] = useState(0);
  const [scrollLoopW, setScrollLoopW] = useState(0);
  const rafRef = useRef<number | null>(null);

  const shouldScroll = items.length > 0 && stripW > 0 && viewportW > 0 && stripW > viewportW + 2;
  /** Half of duplicated scroll content — wait for onContentSizeChange so the loop length is exact. */
  const loopW = shouldScroll ? scrollLoopW : stripW;

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width);
  }, []);

  const onStripLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setStripW((prev) => (Math.abs(w - prev) > 1 ? w : prev));
  }, []);

  const onScrollContentSizeChange = useCallback((w: number) => {
    setScrollLoopW((prev) => {
      const half = w / 2;
      return Math.abs(half - prev) > 1 ? half : prev;
    });
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    setScrollLoopW(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [items]);

  useEffect(() => {
    if (!shouldScroll || loopW <= 0) return;

    const pxPerSec = 28;
    let last = Date.now();

    const tick = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      offsetRef.current += pxPerSec * dt;
      if (offsetRef.current >= loopW) offsetRef.current -= loopW;
      scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [shouldScroll, loopW, items]);

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
    <View
      style={[styles.container, { borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }]}
      onLayout={onViewportLayout}
    >
      {shouldScroll ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(w) => onScrollContentSizeChange(w)}
          contentContainerStyle={styles.scrollInner}
        >
          {renderItems('a')}
          {renderItems('b')}
        </ScrollView>
      ) : (
        <View style={styles.strip} onLayout={onStripLayout}>
          {renderItems('s')}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, paddingVertical: 6, overflow: 'hidden' },
  strip: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingHorizontal: 12 },
  scrollInner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingHorizontal: 12 },
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 18, gap: 6 as any, flexShrink: 0 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '800' },
});
