import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../theme/useThemeTokens';

type TickerItem = { label: string; value?: string | number; tone?: 'up' | 'down' | 'neutral' };

/** px per frame at ~60fps */
const SCROLL_SPEED = 0.65;

export function Ticker({ items }: { items: TickerItem[] }) {
  const { colors, neon } = useThemeTokens();
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const [stripW, setStripW] = useState(0);
  const [dupContentW, setDupContentW] = useState(0);

  const loopW = dupContentW > 0 ? dupContentW / 2 : stripW;
  const overflow = stripW > 0 && viewportW > 0 && stripW > viewportW + 2;

  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width);
  }, []);

  const onStripLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setStripW((prev) => (Math.abs(w - prev) > 1 ? w : prev));
  }, []);

  const onDupContentSizeChange = useCallback((w: number) => {
    setDupContentW((prev) => (Math.abs(w - prev) > 2 ? w : prev));
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    setDupContentW(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [items]);

  const tick = useCallback(() => {
    if (!overflow || loopW <= 0) return;
    offsetRef.current += SCROLL_SPEED;
    if (offsetRef.current >= loopW) offsetRef.current -= loopW;
    scrollRef.current?.scrollTo({ x: offsetRef.current, animated: false });
  }, [overflow, loopW]);

  useLayoutEffect(() => {
    if (!overflow || loopW <= 0) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = () => {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    };
    offsetRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [overflow, loopW, tick, items]);

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
    <View style={styles.wrapper} onLayout={onViewportLayout}>
      {/* Width measure — wrapper has NO overflow:hidden (would clip & break layout) */}
      <View style={styles.measureLayer} pointerEvents="none" collapsable={false}>
        <View style={styles.loopMeasure} onLayout={onStripLayout}>
          {renderItems('m')}
        </View>
      </View>

      {overflow ? (
        <View style={styles.clip}>
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
            onContentSizeChange={(w) => onDupContentSizeChange(w)}
            contentContainerStyle={styles.scrollContent}
          >
            {renderItems('a')}
            {renderItems('b')}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.staticStrip}>{renderItems('s')}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 6,
  },
  measureLayer: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 6,
    zIndex: -1,
    maxHeight: 48,
  },
  loopMeasure: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
  },
  clip: {
    overflow: 'hidden',
    width: '100%',
    zIndex: 1,
  },
  scrollView: { width: '100%' },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
  },
  staticStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  item: { flexDirection: 'row', alignItems: 'center', marginRight: 18, gap: 6 as any, flexShrink: 0 },
  label: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '800' },
});
