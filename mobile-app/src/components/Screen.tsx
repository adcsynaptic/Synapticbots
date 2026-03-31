import React, { PropsWithChildren } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemeTokens } from '../theme/useThemeTokens';

export function Screen({ title, children }: PropsWithChildren<{ title: string }>) {
  const { colors, neon } = useThemeTokens();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              ...(Platform.OS === 'web'
                ? ({ textShadow: `0 0 14px ${neon.cyan}` } as any)
                : { textShadowColor: neon.cyan, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } }),
            },
          ]}
        >
          {title}
        </Text>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  body: { gap: 10 },
});
