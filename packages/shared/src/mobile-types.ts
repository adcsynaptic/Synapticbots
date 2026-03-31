export type MobileEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type MobileUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
};

export type OverviewData = {
  user: MobileUser;
  stats: {
    activeBots: number;
    totalBots: number;
    activeTrades: number;
    totalTrades: number;
    totalPnl: number;
  };
  wallet: {
    binance: number | null;
    coindcx: number | null;
  };
  updatedAt: string;
};

export type PositionItem = {
  id: string;
  symbol: string;
  side: string;
  status: string;
  entryPrice: number;
  currentPrice: number | null;
  pnl: number;
  openedAt: string;
};
