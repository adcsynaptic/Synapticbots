import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useThemeTokens } from '../theme/useThemeTokens';
import { AppButton } from '../components/ui/Button';
import { mobileLogin, mobileSignup } from '../lib/api';
import { useAuthStore } from '../state/auth-store';
import { useNavigation } from '@react-navigation/native';

export function SignupScreen() {
  const { colors } = useThemeTokens();
  const nav = useNavigation<any>();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignup = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await mobileSignup({
        name,
        email,
        phone,
        password,
        confirmPassword,
        referralCode: referralCode || undefined,
      });

      // Auto login just like web signup flow.
      const login = await mobileLogin(email, password);
      await setTokens(login.accessToken, login.refreshToken);
    } catch (err: any) {
      Alert.alert('Signup failed', err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Create Your Account">
      <View style={styles.form}>
        <Text style={[styles.help, { color: colors.textSecondary }]}>Start your 14-day free trial today</Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="John Doe"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="+91 98765 43210"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="Create a password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="Confirm your password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Referral Code (optional)</Text>
        <TextInput
          style={[styles.input, { borderColor: 'rgba(0, 229, 255, 0.12)', backgroundColor: 'rgba(0, 229, 255, 0.04)', color: colors.text }]}
          placeholder="Enter referral code"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          value={referralCode}
          onChangeText={setReferralCode}
        />

        <AppButton title={loading ? 'Creating account...' : 'Create Account'} onPress={onSignup} disabled={loading} variant="primary" />
        <AppButton title="Already have an account? Login" onPress={() => nav.navigate('Login')} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  help: { fontSize: 13, marginBottom: 4 },
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

