import { getApiBaseUrl } from './config';
import { useAuthStore } from '../state/auth-store';

async function refreshTokens(refreshToken: string) {
  const res = await fetch(`${getApiBaseUrl()}/api/mobile/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json();
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error?.message || 'Refresh failed');
  }
  return json.data as { accessToken: string; refreshToken: string };
}

async function request<T>(path: string, init?: RequestInit, attempt = 0): Promise<T> {
  const { accessToken, refreshToken, setTokens, clear } = useAuthStore.getState();
  const baseUrl = getApiBaseUrl();
  // Helps debugging on device: confirms which backend URL the app is actually calling.
  console.log('[api] baseUrl=', baseUrl, 'path=', path);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 && attempt === 0 && refreshToken && !path.includes('/auth/refresh')) {
    try {
      const next = await refreshTokens(refreshToken);
      await setTokens(next.accessToken, next.refreshToken);
      return request<T>(path, init, attempt + 1);
    } catch {
      await clear();
      throw new Error('Unauthorized');
    }
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error?.message || 'Request failed');
  }

  return json.data as T;
}

export async function mobileLogin(email: string, password: string) {
  return request<{
    user: { id: string; email: string; name: string | null; role: string | null };
    accessToken: string;
    refreshToken: string;
  }>('/api/mobile/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function mobileSignup(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  referralCode?: string;
}) {
  const res = await fetch(`${getApiBaseUrl()}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || 'Signup failed');
  }
  return json as { message: string; user: { id: string; email: string; name: string | null } };
}

export async function mobileRefresh(refreshToken: string) {
  return refreshTokens(refreshToken);
}

export const mobileApi = {
  me: () => request<{ user: { id: string; email: string; name: string | null; role: string | null } }>('/api/mobile/v1/auth/me'),
  overview: () => request<any>('/api/mobile/v1/dashboard/overview'),
  positions: () => request<any>('/api/mobile/v1/dashboard/positions'),
  closedPaperTrades: () => request<{ trades: any[] }>('/api/mobile/v1/dashboard/closed-paper-trades'),
  performance: () => request<any>('/api/mobile/v1/dashboard/performance'),
  market: () => request<any>('/api/mobile/v1/market/live'),
  marketCandles: (symbol: string, interval: string, limit: number) =>
    request<{ symbol: string; interval: string; candles: any[] }>(
      `/api/mobile/v1/market/candles?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
    ),
  marketSegments: () => request<{ segments: any[] }>(`/api/mobile/v1/market/segments`),
  engineStatus: () => request<any>('/api/mobile/v1/engine/status'),
  cockpit: () =>
    request<{
      scanned: number;
      inPool: number;
      qualified: number;
      queued: number;
      signalQueue: any[];
      segments: { name: string; value: number }[];
      perBot: Record<string, any>;
      recentTrades: any[];
    }>('/api/mobile/v1/dashboard/cockpit'),
  createBots: (payload: {
    exchange: 'binance' | 'coindcx';
    mode: 'paper' | 'live';
    maxTrades: number;
    capitalPerTrade: number;
    deployments: Array<{ name?: string; segment: string; coinList?: string[] }>;
  }) =>
    request<{ count: number; bots: any[] }>('/api/mobile/v1/bots/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  toggleBot: (botId: string, isActive: boolean) =>
    request<{ success: boolean; isActive: boolean }>('/api/mobile/v1/bots/toggle', {
      method: 'POST',
      body: JSON.stringify({ botId, isActive }),
    }),
  deleteBot: (botId: string) =>
    request<{ success: boolean }>('/api/mobile/v1/bots/delete', {
      method: 'POST',
      body: JSON.stringify({ botId }),
    }),
  botConfig: (botId: string) =>
    request<{ bot: any; config: any; state: any }>(`/api/mobile/v1/bots/config?botId=${encodeURIComponent(botId)}`),
  updateBotConfig: (payload: { botId: string; mode?: 'paper' | 'live'; capitalPerTrade?: number; maxOpenTrades?: number }) =>
    request<{ success: boolean; config: any }>('/api/mobile/v1/bots/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
