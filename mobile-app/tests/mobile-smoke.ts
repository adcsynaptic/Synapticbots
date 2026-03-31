import assert from 'node:assert/strict';
import { formatUsd, sortPositionsByPnl } from '@synaptic/shared';

// Minimal smoke tests to ensure shared helpers work and the package resolution is sane.
function run() {
  assert.equal(formatUsd(undefined), '$0.00');
  assert.equal(formatUsd(null), '$0.00');
  assert.equal(formatUsd(1), '$1.00');

  const sorted = sortPositionsByPnl([
    { id: '1', symbol: 'A', side: 'long', status: 'active', entryPrice: 0, currentPrice: null, pnl: -5, openedAt: '' },
    { id: '2', symbol: 'B', side: 'long', status: 'active', entryPrice: 0, currentPrice: null, pnl: 10, openedAt: '' },
    { id: '3', symbol: 'C', side: 'long', status: 'active', entryPrice: 0, currentPrice: null, pnl: 3, openedAt: '' },
  ]);

  assert.equal(sorted[0].pnl, 10);
  assert.equal(sorted[sorted.length - 1].pnl, -5);

  // eslint-disable-next-line no-console
  console.log('mobile-smoke: ok');
}

run();

