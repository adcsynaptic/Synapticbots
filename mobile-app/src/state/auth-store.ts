import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  restore: () => Promise<void>;
  clear: () => Promise<void>;
};

const ACCESS_KEY = 'mobile_access_token';
const REFRESH_KEY = 'mobile_refresh_token';

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  try {
    if (typeof SecureStore.setItemAsync === 'function') {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // fall back to AsyncStorage if SecureStore is unavailable in this runtime
  }
  await AsyncStorage.setItem(key, value);
}

async function getStoredValue(key: string) {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }
  try {
    if (typeof SecureStore.getItemAsync === 'function') {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // fall back to AsyncStorage if SecureStore is unavailable in this runtime
  }
  return AsyncStorage.getItem(key);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  try {
    if (typeof SecureStore.deleteItemAsync === 'function') {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // fall back to AsyncStorage if SecureStore is unavailable in this runtime
  }
  await AsyncStorage.removeItem(key);
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  setTokens: async (accessToken, refreshToken) => {
    await setStoredValue(ACCESS_KEY, accessToken);
    await setStoredValue(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },
  restore: async () => {
    const accessToken = await getStoredValue(ACCESS_KEY);
    const refreshToken = await getStoredValue(REFRESH_KEY);
    set({ accessToken, refreshToken });
  },
  clear: async () => {
    await deleteStoredValue(ACCESS_KEY);
    await deleteStoredValue(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null });
  },
}));
