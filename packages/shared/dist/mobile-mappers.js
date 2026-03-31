function formatUsd(value) {
  if (value == null || Number.isNaN(value)) return '$0.00';
  return `$${Number(value).toFixed(2)}`;
}

function sortPositionsByPnl(items) {
  const arr = Array.isArray(items) ? items : [];
  return [...arr].sort((a, b) => (b && typeof b.pnl === 'number' ? b.pnl : 0) - (a && typeof a.pnl === 'number' ? a.pnl : 0));
}

module.exports = { formatUsd, sortPositionsByPnl };

