import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { useThemeTokens } from '../theme/useThemeTokens';
import { AppButton } from '../components/ui/Button';

const plans = [
  {
    name: 'Free Trial',
    price: '14 days',
    features: ['5 coin scans', 'Core dashboard access', 'Paper mode support'],
  },
  {
    name: 'Pro',
    price: '$29/mo',
    features: ['Higher scan limits', 'Advanced analytics', 'Priority support'],
  },
  {
    name: 'Ultra',
    price: '$99/mo',
    features: ['Max scan limits', 'All premium features', 'White-glove support'],
  },
] as const;

export function PricingScreen() {
  const nav = useNavigation<any>();
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();

  return (
    <Screen title="Pricing">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose a plan that matches your trading needs.
        </Text>

        {plans.map((plan) => (
          <View key={plan.name} style={[styles.card, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
            <Text style={[styles.price, { color: neon.cyan }]}>{plan.price}</Text>
            {plan.features.map((f) => (
              <Text key={f} style={[styles.feature, { color: colors.textSecondary }]}>
                • {f}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.actions}>
          <AppButton title="Start Free Trial" onPress={() => nav.navigate('Signup')} variant="primary" />
          <View style={{ height: 10 }} />
          <AppButton title="Back to Home" onPress={() => nav.navigate('Landing')} variant="ghost" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 20, gap: 12 },
  subtitle: { fontSize: 14, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  planName: { fontSize: 18, fontWeight: '800' },
  price: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  feature: { fontSize: 13, lineHeight: 18 },
  actions: { marginTop: 8 },
});

