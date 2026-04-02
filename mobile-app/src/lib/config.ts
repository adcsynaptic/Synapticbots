import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv;

  // app.json can provide a production/staging URL.
  // Prefer it over Expo debuggerHost auto-detection because physical devices
  // often cannot reach the debugger host IP.
  const extra = (Constants.expoConfig?.extra || {}) as { apiBaseUrl?: string };
  if (extra.apiBaseUrl && !/localhost|127\.0\.0\.1/.test(extra.apiBaseUrl)) {
    return extra.apiBaseUrl;
  }

  // Dev fallback for physical devices:
  // derive the host IP from Expo debugger host (e.g. 192.168.1.15:19000)
  // and point API requests to your local backend on port 3000.
  const anyConstants = Constants as any;
  const debuggerHost: string | undefined =
    anyConstants?.manifest2?.extra?.expoGo?.debuggerHost ||
    anyConstants?.manifest?.debuggerHost ||
    anyConstants?.expoConfig?.hostUri;

  if (debuggerHost) {
    const host = String(debuggerHost).split(':')[0];
    if (host) return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    // Android emulator cannot reach host localhost directly.
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}
