import { PositionItem } from './mobile-types';

export function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '$0.00';
  return `$${value.toFixed(2)}`;
}

export function sortPositionsByPnl(items: PositionItem[]) {
  return [...items].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
}
