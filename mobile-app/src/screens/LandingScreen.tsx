import React from 'react';
import { ImageBackground, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Lock, Zap, BarChart3, Clock, Shield } from 'lucide-react-native';
import { useThemeTokens } from '../theme/useThemeTokens';
import { getApiBaseUrl } from '../lib/config';
import { AppButton } from '../components/ui/Button';

const features = [
  {
    icon: TrendingUp,
    title: 'Automated Trading',
    description: 'Let advanced algorithms execute trades 24/7 based on market conditions and technical analysis.',
  },
  {
    icon: Lock,
    title: 'Secure & Reliable',
    description: 'Bank-grade security with encrypted API connections to protect your trading credentials.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Execute trades in milliseconds to capitalize on market opportunities before they disappear.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Comprehensive performance metrics and detailed trade history for informed decision-making.',
  },
  {
    icon: Clock,
    title: '24/7 Monitoring',
    description: 'Continuous market surveillance with real-time alerts for critical trading events.',
  },
  {
    icon: Shield,
    title: 'Risk Management',
    description: 'Intelligent stop-loss and take-profit mechanisms to protect your capital.',
  },
] as const;

export function LandingScreen() {
  const nav = useNavigation<any>();
  const { colors, neon, glassBg, glassBorder } = useThemeTokens();

  const bgUri = `${getApiBaseUrl()}/bg-deep-space.png`;

  const onStartTrial = () => nav.navigate('Signup');
  const onViewPricing = () => nav.navigate('Pricing');

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]}>
      <ImageBackground source={{ uri: bgUri }} style={styles.heroBg} resizeMode="cover">
        <View style={styles.heroOverlay}>
          <View style={styles.header}>
            <Text style={[styles.brand, { color: neon.cyan }]}>Synaptic</Text>
            <View style={styles.headerRight}>
              <AppButton title="View Pricing" onPress={onViewPricing} variant="ghost" />
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              AI Powered{' '}
              <Text
                style={
                  Platform.OS === 'web'
                    ? ({ color: neon.cyan, textShadow: `0 0 12px ${neon.cyanGlow}` } as any)
                    : { color: neon.cyan, textShadowColor: neon.cyanGlow, textShadowRadius: 12 }
                }
              >
                {'Crypto Trading'}
              </Text>
              {'\n'}On Autopilot
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Harness the power of automated trading with Synaptic. Execute strategies on trading platforms with precision, speed, and confidence.
            </Text>
            <View style={styles.ctaRow}>
              <AppButton title="Start 14-Day Free Trial" onPress={onStartTrial} variant="primary" />
              <View style={{ height: 10 }} />
              <AppButton title="Already have an account? Login" onPress={() => nav.navigate('Login')} variant="ghost" />
            </View>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Why Choose Synaptic?</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Professional-grade trading automation built for traders of all levels
        </Text>

        <View style={styles.featuresGrid}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.title} style={[styles.featureCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                  <Icon color={neon.cyan} size={24} />
                </View>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{f.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.ctaSection, { backgroundColor: glassBg, borderColor: glassBorder }]}>
        <Text style={[styles.ctaTitle, { color: colors.text }]}>Ready to Transform Your Trading?</Text>
        <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>Join traders who are already leveraging automated strategies</Text>
        <AppButton title="Get Started Free" onPress={onStartTrial} variant="primary" />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>© 2026 Synaptic. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroBg: { width: '100%', minHeight: 560, justifyContent: 'flex-start' },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 22, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  heroContent: { paddingTop: 64 },
  heroTitle: { fontSize: 34, fontWeight: '800', lineHeight: 40, textAlign: 'center', marginBottom: 18 },
  heroSubtitle: { fontSize: 16, lineHeight: 22, textAlign: 'center', marginHorizontal: 8, marginBottom: 24 },
  ctaRow: { alignItems: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 10 },
  sectionTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  sectionSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 18 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 as any },
  featureCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  featureIconWrap: { borderRadius: 12, padding: 10, alignItems: 'flex-start', marginBottom: 10 },
  featureTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  ctaSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { fontSize: 12, textAlign: 'center' },
});

