/**
 * Pipeline stage classification — aligned with web `BrainExecutionSummary`
 * (sentinel-saas/nextjs_space/components/dashboard/command-center.tsx).
 */
export type BrainStage = { stage: string; stageNum: number; reason: string; color: string; icon: string };

export function getBrainStage(c: any, botId?: string): BrainStage {
  const a = (c.action || '').toUpperCase();
  const ds = (botId && c.bot_deploy_statuses?.[botId]) || c.deploy_status || '';
  const athena = c.athena_state;

  if (ds === 'DEPLOY_QUEUED' || ds === 'ACTIVE' || a.includes('DEPLOYED')) {
    return { stage: 'DEPLOYED', stageNum: 5, reason: 'Trade opened successfully', color: '#06B6D4', icon: '' };
  }

  if (athena) {
    if (athena.action === 'EXECUTE' || athena.action === 'LONG' || athena.action === 'SHORT') {
      const blockReason = ds.startsWith('FILTERED') ? ds.replace('FILTERED: ', '') : 'Exec failed';
      return { stage: 'ATHENA', stageNum: 4, reason: `Approved but: ${blockReason}`, color: '#22C55E', icon: '' };
    }
    if (athena.action === 'VETO' || athena.action === 'SKIP' || athena.action === 'HOLD') {
      return { stage: 'ATHENA VETO', stageNum: 4, reason: `Vetoed: ${(athena.reasoning || '').slice(0, 80)}`, color: '#EF4444', icon: '' };
    }
  }

  if (ds.startsWith('FILTERED')) {
    const filterReason = ds.replace('FILTERED: ', '');
    if (filterReason.includes('Athena')) {
      return { stage: 'ATHENA VETO', stageNum: 4, reason: filterReason, color: '#EF4444', icon: '' };
    }
    return { stage: 'FILTERED', stageNum: 3, reason: filterReason, color: '#F59E0B', icon: '' };
  }

  if (a.includes('ELIGIBLE')) {
    return { stage: 'QUALIFIED', stageNum: 3, reason: 'HMM eligible — awaiting deploy', color: '#22C55E', icon: '' };
  }

  if (
    !a.includes('SEGMENT_POOL_SKIP') &&
    !a.includes('SEGMENT POOL SKIP') &&
    !a.includes('DIRECTION_GATE_SKIP') &&
    !a.includes('DIRECTION GATE SKIP')
  ) {
    let reason = 'No HMM consensus';
    if (a.includes('MTF_CONFLICT') || a.includes('NO_CONSENSUS')) reason = 'No multi-TF consensus';
    else if (a.includes('CHOP')) reason = 'Sideways — no signal';
    else if (a.includes('15M_FILTER')) reason = '15m momentum opposes';
    else if (a.includes('CRASH') || a.includes('MACRO')) reason = 'Crash regime — safety skip';
    else if (a.includes('WEEKEND')) reason = 'Weekend skip';
    else if (a.includes('VOL_TOO_HIGH')) reason = 'ATR too high';
    else if (a.includes('VOL_TOO_LOW')) reason = 'ATR too low';
    else if (a.includes('SENTIMENT')) reason = 'Sentiment veto';
    else if (a.includes('LOW_CONVICTION')) reason = 'Conviction too low';
    const conv =
      c.conviction != null
        ? Number(c.conviction)
        : c.confidence != null
          ? c.confidence <= 1
            ? c.confidence * 100
            : c.confidence
          : 0;
    if (conv === 0 && !a) reason = 'No HMM consensus across timeframes';
    return { stage: 'IN POOL', stageNum: 2, reason, color: '#6B7280', icon: '' };
  }

  const poolReason = c.reason || c.pool_desc || 'Not in current segment rotation';
  return { stage: 'OUT OF POOL', stageNum: 1, reason: poolReason, color: '#4B5563', icon: '' };
}

export function coinConvictionPct(c: any): number {
  if (c.conviction != null) return Number(c.conviction);
  if (c.confidence != null) {
    const x = Number(c.confidence);
    return x <= 1 ? x * 100 : x;
  }
  return 0;
}

export type CoinRow = any & BrainStage & { symbol: string };

export function buildSortedCoinRows(coinStates: Record<string, any>): CoinRow[] {
  const coins = Object.entries(coinStates || {}).map(([sym, c]) => ({ ...c, symbol: sym }));
  const classified = coins.map((c) => ({ ...c, ...getBrainStage(c) }));
  return [...classified].sort((a, b) => {
    if (a.stageNum !== b.stageNum) return b.stageNum - a.stageNum;
    const ac = a.conviction != null ? Number(a.conviction) : 0;
    const bc = b.conviction != null ? Number(b.conviction) : 0;
    return bc - ac;
  });
}

export function stripUsdt(sym: string): string {
  return String(sym || '').replace(/USDT$/i, '');
}
