import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View, Text } from 'react-native';
import { mobileLogin } from '../lib/api';
import { useAuthStore } from '../state/auth-store';
import { Screen } from '../components/Screen';
import { useThemeTokens } from '../theme/useThemeTokens';
import { AppButton } from '../components/ui/Button';
import { useNavigation } from '@react-navigation/native';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const { colors, neon } = useThemeTokens();
  const nav = useNavigation<any>();

  const onLogin = async () => {
    try {
      setLoading(true);
      const res = await mobileLogin(email, password);
      await setTokens(res.accessToken, res.refreshToken);
    } catch (err: any) {
      // Surface the real network error so we can distinguish CORS/cleartext/URL issues.
      console.error('Login error:', err);
      Alert.alert('Login failed', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Synaptic Login">
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderColor: 'rgba(0, 229, 255, 0.12)', color: colors.text },
          ]}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: 'rgba(0, 229, 255, 0.04)', borderColor: 'rgba(0, 229, 255, 0.12)', color: colors.text },
          ]}
          placeholder="Enter your password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AppButton title={loading ? 'Logging in...' : 'Login'} onPress={onLogin} disabled={loading} variant="primary" />
        <AppButton title="Create a new account" onPress={() => nav.navigate('Signup')} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  label: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});
