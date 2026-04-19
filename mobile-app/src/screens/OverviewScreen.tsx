import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { mobileApi } from '../lib/api';
import { Screen } from '../components/Screen';
import { formatUsd } from '@synaptic/shared';
import { useThemeTokens } from '../theme/useThemeTokens';
import { RegimeGauge } from '../components/Gauge';
import { buildSortedCoinRows, coinConvictionPct, stripUsdt } from '../lib/brain-execution';
import React from 'react';

const EMPTY_COIN_STATES: Record<string, unknown> = {};
const SEGMENT_OPTIONS = ['L1', 'L2', 'AI', 'Meme', 'DeFi', 'RWA', 'Gaming', 'DePIN', 'Modular', 'Oracles'];

export function OverviewScreen() {
  const { colors, glassBg, glassBorder, neon } = useThemeTokens();
  const queryClient = useQueryClient();
  const nav = useNavigation<any>();
  const overviewQ = useQuery({ queryKey: ['overview'], queryFn: mobileApi.overview, refetchInterval: 15000 });
  const engine = useQuery({ queryKey: ['engine-status'], queryFn: mobileApi.engineStatus, refetchInterval: 15000 });
  const positionsQ = useQuery({ queryKey: ['positions-mini'], queryFn: mobileApi.positions, refetchInterval: 15000 });
  const marketQ = useQuery({ queryKey: ['market-kpis'], queryFn: mobileApi.market, refetchInterval: 15000 });
  const cockpitQ = useQuery({ queryKey: ['cockpit'], queryFn: mobileApi.cockpit, refetchInterval: 15000 });

  const data = overviewQ.data;
  const isLoading = overviewQ.isLoading;
  const error = overviewQ.error;
  const stats = data?.stats;
  const wallet = data?.wallet;
  const myBots: any[] = Array.isArray(data?.bots) ? data.bots : [];
  const engineSnap = engine.data?.snapshot;
  const athena = engine.data?.athena;
  const athenaQueue = athena?.athenaRecentDecisions ?? athena?.recent_decisions ?? [];
  const coinStates = engine.data?.multi?.coin_states ?? EMPTY_COIN_STATES;
  const segQ = useQuery({ queryKey: ['segments'], queryFn: mobileApi.marketSegments, refetchInterval: 30000 });
  const perBot: Record<string, any> | undefined = engine.data?.perBot;
  const recentTrades: any[] = engine.data?.tradebookAllModes?.trades || engine.data?.tradebook?.trades || [];
  const multi = engine.data?.multi || {};
  const pendingSignals: any[] = Array.isArray(multi?.pending_signals_detail) ? multi.pending_signals_detail : [];
  const cockpitSignalQ: any[] = Array.isArray(cockpitQ.data?.signalQueue) ? cockpitQ.data.signalQueue : [];
  const [nextSecs, setNextSecs] = React.useState<number | null>(null);
  const [showCreateBotModal, setShowCreateBotModal] = React.useState(false);
  const [creatingBot, setCreatingBot] = React.useState(false);
  const [deployType, setDeployType] = React.useState<'adaptive' | 'segments'>('adaptive');
  const [selectedSegments, setSelectedSegments] = React.useState<string[]>([]);
  const [deployExchange, setDeployExchange] = React.useState<'binance' | 'coindcx'>('binance');
  const [deployMode, setDeployMode] = React.useState<'paper' | 'live'>('paper');
  const [deployMaxTrades, setDeployMaxTrades] = React.useState(10);
  const [deployCapitalPerTrade, setDeployCapitalPerTrade] = React.useState(100);
  const [busyBotId, setBusyBotId] = React.useState<string | null>(null);
  const [showEditBotModal, setShowEditBotModal] = React.useState(false);
  const [editBotId, setEditBotId] = React.useState<string | null>(null);
  const [editMode, setEditMode] = React.useState<'paper' | 'live'>('paper');
  const [editMaxTrades, setEditMaxTrades] = React.useState(10);
  const [editCapitalPerTrade, setEditCapitalPerTrade] = React.useState(100);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [expandedBotTrades, setExpandedBotTrades] = React.useState<Record<string, boolean>>({});

  const sortedCoinRows = React.useMemo(() => buildSortedCoinRows(coinStates as Record<string, any>), [coinStates]);
  const paperTradesByBot = React.useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const t of recentTrades) {
      const mode = String(t?.engineMode || t?.mode || 'paper').toLowerCase();
      if (mode !== 'paper') continue;
      const botId = String(t?.botId || t?.bot_id || t?.engineId || t?.engine_id || '');
      if (!botId) continue;
      if (!grouped[botId]) grouped[botId] = [];
      grouped[botId].push(t);
    }
    return grouped;
  }, [recentTrades]);

  function colorForDelta(delta: number) {
    const d = Math.max(-15, Math.min(15, Number.isFinite(delta) ? delta : 0));
    if (d >= 0) {
      const t = d / 15;
      return `rgba(16, 185, 129, ${0.35 + 0.45 * t})`;
    } else {
      const t = Math.abs(d) / 15;
      return `rgba(239, 68, 68, ${0.35 + 0.45 * t})`;
    }
  }

  React.useEffect(() => {
    let t: any;
    const update = () => {
      const ts = engineSnap?.nextAnalysisTime;
      if (!ts) { setNextSecs(null); return; }
      const remain = Math.ceil((new Date(ts).getTime() - Date.now()) / 1000);
      setNextSecs(remain);
    };
    update();
    t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [engineSnap?.nextAnalysisTime]);

  function toggleSegment(segment: string) {
    setSelectedSegments((prev) => (prev.includes(segment) ? prev.filter((s) => s !== segment) : [...prev, segment]));
  }

  async function handleCreateBots() {
    if (creatingBot) return;
    if (deployType === 'segments' && selectedSegments.length === 0) {
      Alert.alert('Select segments', 'Pick at least one segment or switch to Adaptive.');
      return;
    }

    const deployments =
      deployType === 'adaptive'
        ? [{ name: 'ALL', segment: 'ALL', coinList: [] as string[] }]
        : selectedSegments.map((segment) => ({ name: segment, segment, coinList: [] as string[] }));

    setCreatingBot(true);
    try {
      const result = await mobileApi.createBots({
        exchange: deployExchange,
        mode: deployMode,
        maxTrades: Math.max(1, deployMaxTrades),
        capitalPerTrade: Math.max(10, deployCapitalPerTrade),
        deployments,
      });
      setShowCreateBotModal(false);
      setSelectedSegments([]);
      Alert.alert('Bots created', `Successfully created ${result.count} bot${result.count === 1 ? '' : 's'}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['engine-status'] }),
        queryClient.invalidateQueries({ queryKey: ['cockpit'] }),
        overviewQ.refetch(),
        engine.refetch(),
        cockpitQ.refetch(),
      ]);
    } catch (e) {
      Alert.alert('Create bot failed', String((e as Error).message || 'Please try again.'));
    } finally {
      setCreatingBot(false);
    }
  }

  async function refreshCockpitData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['overview'] }),
      queryClient.invalidateQueries({ queryKey: ['engine-status'] }),
      queryClient.invalidateQueries({ queryKey: ['cockpit'] }),
      overviewQ.refetch(),
      engine.refetch(),
      cockpitQ.refetch(),
    ]);
  }

  async function handleToggleBot(botId: string, nextActive: boolean) {
    if (busyBotId) return;
    setBusyBotId(botId);
    try {
      await mobileApi.toggleBot(botId, nextActive);
      await refreshCockpitData();
    } catch (e) {
      Alert.alert('Bot action failed', String((e as Error).message || 'Please try again.'));
    } finally {
      setBusyBotId(null);
    }
  }

  function handleDeleteBot(botId: string) {
    Alert.alert('Delete bot', 'Delete this bot permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (busyBotId) return;
            setBusyBotId(botId);
            try {
              await mobileApi.deleteBot(botId);
              await refreshCockpitData();
            } catch (e) {
              Alert.alert('Delete failed', String((e as Error).message || 'Please try again.'));
            } finally {
              setBusyBotId(null);
            }
          })();
        },
      },
    ]);
  }

  async function handleOpenEditBot(botId: string) {
    if (busyBotId) return;
    setBusyBotId(botId);
    try {
      const data = await mobileApi.botConfig(botId);
      const cfg = data.config || {};
      setEditBotId(botId);
      setEditMode(String(cfg.mode || 'paper').toLowerCase().startsWith('live') ? 'live' : 'paper');
      setEditMaxTrades(Math.max(1, Number(cfg.maxOpenTrades || 10)));
      setEditCapitalPerTrade(Math.max(10, Number(cfg.capitalPerTrade || 100)));
      setShowEditBotModal(true);
    } catch (e) {
      Alert.alert('Open edit failed', String((e as Error).message || 'Please try again.'));
    } finally {
      setBusyBotId(null);
    }
  }

  async function handleSaveBotEdit() {
    if (!editBotId || savingEdit) return;
    setSavingEdit(true);
    try {
      await mobileApi.updateBotConfig({
        botId: editBotId,
        mode: editMode,
        maxOpenTrades: Math.max(1, editMaxTrades),
        capitalPerTrade: Math.max(10, editCapitalPerTrade),
      });
      setShowEditBotModal(false);
      setEditBotId(null);
      await refreshCockpitData();
      Alert.alert('Updated', 'Bot settings updated.');
    } catch (e) {
      Alert.alert('Update failed', String((e as Error).message || 'Please try again.'));
    } finally {
      setSavingEdit(false);
    }
  }

  function toggleBotTrades(botId: string) {
    setExpandedBotTrades((prev) => ({ ...prev, [botId]: !prev[botId] }));
  }

  return (
    <Screen title="Cockpit" safeTop={false}>

      {isLoading ? <Text style={{ color: colors.textSecondary }}>Loading dashboard...</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{String((error as Error).message)}</Text> : null}

      {stats ? (
        <View style={styles.stack}>
          <View style={[styles.heroCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Welcome, <Text style={{ color: neon.cyan }}>{data?.user?.name || 'Trader'}</Text>
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              AI trading cockpit is live. Monitor signals, risk, and positions in real-time.
            </Text>
          </View>

          {/* KPI strip */}
          <View style={[styles.kpiRow, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              BTC {marketQ.data?.btc?.price ? `${formatUsd(marketQ.data.btc.price)}` : '—'}
            </Text>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              F/G {marketQ.data?.fearGreed?.value ?? '—'}
            </Text>
            <Text style={[styles.kpiText, { color: colors.textSecondary }]}>
              Bots {String(stats.activeBots)}/{String(stats.totalBots)}
            </Text>
          </View>

          <View style={styles.grid}>
            <StatCard label="Active Bots" value={String(stats.activeBots)} tone={neon.cyan} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Active Trades" value={String(stats.activeTrades)} tone={neon.amber} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total Trades" value={String(stats.totalTrades)} tone={neon.violet} bg={glassBg} border={glassBorder} text={colors.text} />
            <StatCard label="Total PnL" value={formatUsd(stats.totalPnl)} tone={stats.totalPnl >= 0 ? neon.emerald : neon.danger} bg={glassBg} border={glassBorder} text={colors.text} />
          </View>

          {/* Engine Snapshot */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Engine Snapshot</Text>
            {engine.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>Loading engine…</Text>
            ) : engine.error ? (
              <Text style={{ color: colors.danger }}>Engine unreachable</Text>
            ) : (
              <>
                <View style={{ alignItems: 'center', marginBottom: 6 }}>
                  <RegimeGauge confidence={Number(engine.data?.state?.confidence || 0)} />
                </View>
                {/* Brain Execution Summary counters */}
                <View style={styles.besRow}>
                  <View style={[styles.besCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.besLabel, { color: colors.textSecondary }]}>SCANNED</Text>
                    <Text style={[styles.besValue, { color: colors.text }]}>{cockpitQ.data?.scanned ?? Object.keys(coinStates).length}</Text>
                  </View>
                  <View style={[styles.besCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.besLabel, { color: colors.textSecondary }]}>IN POOL</Text>
                    <Text style={[styles.besValue, { color: colors.text }]}>{cockpitQ.data?.inPool ?? Number(multi?.coins_scanned ?? Object.keys(coinStates).length)}</Text>
                  </View>
                  <View style={[styles.besCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.besLabel, { color: colors.textSecondary }]}>QUALIFIED</Text>
                    <Text style={[styles.besValue, { color: colors.text }]}>{cockpitQ.data?.qualified ?? Number(multi?.eligible_count ?? 0)}</Text>
                  </View>
                  <View style={[styles.besCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.besLabel, { color: colors.textSecondary }]}>QUEUED</Text>
                    <Text style={[styles.besValue, { color: colors.text }]}>{cockpitQ.data?.queued ?? athenaQueue.length}</Text>
                  </View>
                </View>
                <Row label="Cycle" value={String(engineSnap?.cycle ?? '—')} color={colors.text} />
                <Row label="Coins Scanned" value={String(engineSnap?.coinsScanned ?? '—')} color={colors.text} />
                <Row label="Last Analysis" value={engineSnap?.lastAnalysisTime ?? '—'} color={colors.text} />
                <Row label="Next Analysis" value={engineSnap?.nextAnalysisTime ?? '—'} color={colors.text} />
                <Row label="Countdown" value={nextSecs != null ? `${Math.max(0, nextSecs)}s` : '—'} color={colors.text} />
              </>
            )}
          </View>

          {/* Brain / Execution Summary */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Brain / Execution Summary</Text>
            <Row label="Athena" value={athena?.enabled ? (athena?.model || 'enabled') : 'disabled'} color={colors.text} />
            <Row label="Cycle" value={String(multi?.cycle ?? 0)} color={colors.text} />
            <Row label="Interval" value={`${multi?.analysis_interval_seconds ?? 0}s`} color={colors.text} />
            <Row label="Coins Scanned" value={String(Object.keys(coinStates).length)} color={colors.text} />
            <Row label="Eligible" value={String(multi?.eligible_count ?? 0)} color={colors.text} />
            <Row label="Deployed" value={String(multi?.deployed_count ?? 0)} color={colors.text} />
            {!!athena?.recent_decisions?.length && (
              <Row label="Recent Decisions" value={String(athena.recent_decisions.length)} color={colors.text} />
            )}
          </View>

          {/* Signal Queue — same source as web: engine pending_signals_detail, else cockpit/athena */}
          {(pendingSignals.length > 0 || cockpitSignalQ.length > 0 || athenaQueue.length > 0) && !engine.isLoading && !engine.error ? (
            <View
              style={[
                styles.engineCard,
                styles.signalQueueCard,
                { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.35)' },
              ]}
            >
              <Text style={[styles.signalQueueTitle, { color: neon.amber }]}>Signal Queue — Athena-Approved, Awaiting Deploy</Text>
              {pendingSignals.length > 0
                ? pendingSignals.map((s: any, i: number) => {
                    const side = String(s.side || '').toUpperCase();
                    const long = side === 'LONG' || side === 'BUY';
                    const ttlMin = Math.max(1, Math.ceil(Number(s.expires_in_sec || 0) / 60));
                    const conv = Number(s.conviction ?? 0);
                    return (
                      <View key={`${s.symbol}-${i}`} style={[styles.sigQRow, { borderColor: 'rgba(245,158,11,0.28)' }]}>
                        <Text style={[styles.sigQSym, { color: colors.text }]}>{stripUsdt(String(s.symbol || ''))}</Text>
                        <Text style={[styles.sigQSide, { color: long ? neon.emerald : neon.danger }]}>{long ? 'LONG' : 'SHORT'}</Text>
                        <Text style={[styles.sigQConv, { color: neon.amber }]}>{Number.isFinite(conv) ? `${Math.round(conv)}%` : '—'}</Text>
                        <Text style={[styles.sigQTtl, { color: colors.textSecondary }]}>TTL {ttlMin}m</Text>
                      </View>
                    );
                  })
                : cockpitSignalQ.length > 0
                  ? cockpitSignalQ.slice(0, 12).map((q: any, i: number) => {
                      const side = String(q.side || '').toUpperCase();
                      const long = side === 'LONG' || side === 'BUY';
                      const conv = q.confidence != null ? Number(q.confidence) : null;
                      const ttl = q.ttl != null ? `${q.ttl}` : '';
                      return (
                        <View key={`cq-${i}`} style={[styles.sigQRow, { borderColor: 'rgba(245,158,11,0.28)' }]}>
                          <Text style={[styles.sigQSym, { color: colors.text }]}>{stripUsdt(String(q.symbol || ''))}</Text>
                          <Text style={[styles.sigQSide, { color: long ? neon.emerald : neon.danger }]}>{long ? 'LONG' : 'SHORT'}</Text>
                          <Text style={[styles.sigQConv, { color: neon.amber }]}>
                            {conv != null && Number.isFinite(conv) ? `${Math.round(conv)}%` : '—'}
                          </Text>
                          {ttl ? <Text style={[styles.sigQTtl, { color: colors.textSecondary }]}>TTL {ttl}</Text> : null}
                        </View>
                      );
                    })
                  : athenaQueue.slice(0, 12).map((q: any, i: number) => (
                      <View key={`ath-${i}`} style={[styles.sigQRow, { borderColor: 'rgba(245,158,11,0.28)' }]}>
                        <Text style={[styles.sigQSym, { color: colors.text }]}>{stripUsdt(String(q.symbol || ''))}</Text>
                        <Text
                          style={[
                            styles.sigQSide,
                            { color: String(q.side || '').toUpperCase() === 'LONG' ? neon.emerald : neon.danger },
                          ]}
                        >
                          {String(q.side || '').toUpperCase() || '—'}
                        </Text>
                        <Text style={[styles.sigQConv, { color: neon.amber }]}>
                          {q.conviction != null
                            ? `${Math.round(Number(q.conviction) * 100)}%`
                            : q.confidence != null
                              ? `${Math.round(Number(q.confidence))}%`
                              : '—'}
                        </Text>
                      </View>
                    ))}
            </View>
          ) : null}

          {/* Coin pipeline — matches web Brain Execution table */}
          {sortedCoinRows.length > 0 && !engine.isLoading && !engine.error ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Brain Execution — Coin Pipeline</Text>
              <Text style={[styles.pipelineHint, { color: colors.textSecondary }]}>
                Segment → HMM → Athena → Deploy (same stages as web)
              </Text>
              <ScrollView style={styles.pipelineScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                {sortedCoinRows.map((c: any, idx: number) => {
                  const regime = String(c.regime ?? '—');
                  const conv = coinConvictionPct(c);
                  const inSegPool = (c.stageNum ?? 0) >= 2;
                  const seg = c.segment || '—';
                  return (
                    <View key={c.symbol || idx} style={[styles.pipelineRow, { borderColor: glassBorder }]}>
                      <View style={styles.pipelineRowTop}>
                        <Text style={[styles.pipelineIdx, { color: colors.textSecondary }]}>{idx + 1}</Text>
                        <Text style={[styles.pipelineCoin, { color: colors.text }]}>{stripUsdt(c.symbol)}</Text>
                        <Text style={[styles.pipelineSeg, { color: neon.cyan }]} numberOfLines={1}>
                          {seg}
                        </Text>
                        <View style={[styles.stageBadge, { backgroundColor: `${c.color}22`, borderColor: `${c.color}44` }]}>
                          <Text style={[styles.stageBadgeText, { color: c.color }]} numberOfLines={1}>
                            {c.stage}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.pipelineRegime, { color: colors.textSecondary }]} numberOfLines={3}>
                        {inSegPool ? regime : '—'}
                      </Text>
                      <View style={styles.pipelineRowMid}>
                        <Text style={[styles.pipelineConv, { color: inSegPool && conv > 0 ? neon.emerald : colors.textSecondary }]}>
                          {inSegPool && conv > 0 ? `${Math.round(conv)}%` : '—'}
                        </Text>
                      </View>
                      <Text style={[styles.pipelineReason, { color: colors.textSecondary }]} numberOfLines={3}>
                        {c.reason}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Active Positions (Top 5) */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Positions</Text>
            {positionsQ.isLoading ? (
              <Text style={{ color: colors.textSecondary }}>Loading positions…</Text>
            ) : positionsQ.error ? (
              <Text style={{ color: colors.danger }}>Failed to load positions</Text>
            ) : (
              (positionsQ.data?.positions || []).slice(0, 5).map((p: any, i: number) => (
                <View key={String(p.id ?? `pos-${i}`)} style={styles.predRow}>
                  <Text style={[styles.predSymbol, { color: colors.text }]}>{String(p.symbol || '').toUpperCase()}</Text>
                  <Text style={[styles.predSide, { color: (String(p.side || '').toUpperCase() === 'LONG') ? neon.emerald : neon.danger }]}>
                    {String(p.side || '').toUpperCase()}
                  </Text>
                  <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    PnL {formatUsd(Number(p.pnl || 0))}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Per-bot Mini Cards */}
          {perBot && Object.keys(perBot).length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bots</Text>
              <View style={styles.botGrid}>
                {Object.entries(perBot).slice(0, 6).map(([botId, b]: any) => (
                  <View key={botId} style={[styles.botCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.botTitle, { color: colors.text }]} numberOfLines={1}>{botId.slice(0, 6)}</Text>
                    <Text style={[styles.botMeta, { color: colors.textSecondary }]}>
                      Active {Number(b.activeTrades || 0)} / Total {Number(b.totalTrades || 0)}
                    </Text>
                    <Text style={[styles.botPnl, { color: Number(b.totalPnl || b.activePnl || 0) >= 0 ? neon.emerald : neon.danger }]}>
                      {formatUsd(Number((b.activePnl ?? 0) + (b.totalPnl ?? 0)))}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Bots</Text>
            {myBots.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>No bots created yet.</Text>
            ) : (
              myBots.slice(0, 8).map((b) => (
                <View key={b.id} style={styles.botRowWrap}>
                  <View style={styles.predRow}>
                    <Text style={[styles.predSymbol, { color: colors.text }]} numberOfLines={1}>
                      {String(b.name || '').toUpperCase()}
                    </Text>
                    <Text style={[styles.predSide, { color: b.isActive ? neon.emerald : colors.textSecondary }]}>
                      {b.isActive ? 'ACTIVE' : 'STOPPED'}
                    </Text>
                    <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {String(b.segment || 'ALL')} · {String(b.mode || 'paper').toUpperCase()} · {String(b.exchange || '')}
                    </Text>
                  </View>
                  <View style={styles.botActionRow}>
                    <Pressable
                      onPress={() => void handleToggleBot(b.id, !b.isActive)}
                      style={({ pressed }) => [
                        styles.botActionBtn,
                        { borderColor: glassBorder, opacity: pressed || busyBotId === b.id ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={{ color: b.isActive ? neon.amber : neon.emerald, fontWeight: '700', fontSize: 11 }}>
                        {b.isActive ? 'Stop' : 'Start'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleOpenEditBot(b.id)}
                      style={({ pressed }) => [
                        styles.botActionBtn,
                        { borderColor: glassBorder, opacity: pressed || busyBotId === b.id ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 11 }}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleBotTrades(b.id)}
                      style={({ pressed }) => [
                        styles.botActionBtn,
                        { borderColor: glassBorder, opacity: pressed || busyBotId === b.id ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={{ color: neon.cyan, fontWeight: '700', fontSize: 11 }}>
                        {expandedBotTrades[b.id] ? 'Hide Trades' : `Paper Trades (${(paperTradesByBot[b.id] || []).length})`}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteBot(b.id)}
                      style={({ pressed }) => [
                        styles.botActionBtn,
                        { borderColor: 'rgba(239,68,68,0.4)', opacity: pressed || busyBotId === b.id ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 11 }}>Delete</Text>
                    </Pressable>
                  </View>
                  {expandedBotTrades[b.id] ? (
                    <View style={[styles.botTradesPanel, { borderColor: glassBorder }]}>
                      {(paperTradesByBot[b.id] || []).length === 0 ? (
                        <Text style={[styles.botTradesEmpty, { color: colors.textSecondary }]}>No paper trades.</Text>
                      ) : (
                        (paperTradesByBot[b.id] || []).map((t: any, i: number) => {
                          const side = String(t.position || t.side || '').toUpperCase();
                          const sym = String(t.symbol || t.coin || '').toUpperCase();
                          const status = String(t.status || 'UNKNOWN').toUpperCase();
                          const isActive = status === 'ACTIVE';
                          const pnl = Number(t.activePnl ?? t.unrealizedPnl ?? t.pnl ?? 0);
                          const sideLong = side === 'LONG' || side === 'BUY';
                          return (
                            <View key={`${b.id}-trade-${String(t.id || i)}`} style={styles.botTradeRow}>
                              <Text style={[styles.botTradeSym, { color: colors.text }]}>{sym || '—'}</Text>
                              <Text style={[styles.botTradeSide, { color: sideLong ? neon.emerald : neon.danger }]}>
                                {side || '—'}
                              </Text>
                              <Text style={[styles.botTradeStatus, { color: isActive ? neon.cyan : colors.textSecondary }]}>
                                {isActive ? 'OPEN' : status}
                              </Text>
                              <Text
                                style={[
                                  styles.botTradePnl,
                                  { color: pnl >= 0 ? neon.emerald : neon.danger },
                                ]}
                              >
                                {formatUsd(pnl)}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>

          {/* Segment Heatmap Grid */}
          {Array.isArray((cockpitQ.data?.segments || segQ.data?.segments)) && (cockpitQ.data?.segments || segQ.data?.segments)?.length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Segments</Text>
              <View style={styles.heatGrid}>
                {(cockpitQ.data?.segments || segQ.data?.segments)?.map((s: any, i: number) => {
                  const v = Number.isFinite(Number(s.value)) ? Number(s.value) : Number(s.roi_24h || s.change_24h || 0);
                  const bg = colorForDelta(v);
                  return (
                    <View key={i} style={[styles.heatCell, { backgroundColor: bg, borderColor: 'rgba(255,255,255,0.06)' }]}>
                      <Text style={[styles.heatName, { color: '#FFFFFF' }]} numberOfLines={1}>
                        {s.name || s.segment || 'SEG'}
                      </Text>
                      <Text style={[styles.heatVal, { color: '#FFFFFF' }]}>{`${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(2)}%`}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Market Structure Panel */}
          <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Market Structure</Text>
            <View style={styles.msGrid}>
              {['Regime', 'Eligible', 'Deployed', 'Cycle'].map((k) => {
                let value: string | number = '—';
                if (k === 'Regime') value = String(engine.data?.state?.regime || 'WAITING');
                if (k === 'Eligible') value = String(multi?.eligible_count ?? 0);
                if (k === 'Deployed') value = String(multi?.deployed_count ?? 0);
                if (k === 'Cycle') value = String(multi?.cycle ?? 0);
                return (
                  <View key={k} style={[styles.msCard, { borderColor: glassBorder, backgroundColor: glassBg }]}>
                    <Text style={[styles.msTitle, { color: colors.textSecondary }]}>{k}</Text>
                    <Text style={[styles.msValue, { color: colors.text }]}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent Trades */}
          {recentTrades.length ? (
            <View style={[styles.engineCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trades</Text>
              {recentTrades.slice(0, 6).map((t: any, i: number) => {
                const sym = String(t.symbol || t.coin || '').toUpperCase();
                const side = String(t.position || t.side || '').toUpperCase();
                const isActive = String(t.status || '').toUpperCase() === 'ACTIVE';
                const pnl = Number(isActive ? (t.activePnl || 0) : (t.totalPnl || 0));
                const mode = String(t.engineMode || t.mode || '').toLowerCase();
                const key = `rt-${mode || 'na'}-${String(t.id ?? '')}-${sym}-${side}-${i}`;
                return (
                  <View key={key} style={styles.predRow}>
                    <Text style={[styles.predSymbol, { color: colors.text }]}>{sym}</Text>
                    <Text style={[styles.predSide, { color: side === 'LONG' ? neon.emerald : neon.danger }]}>{side || '—'}</Text>
                    <Text style={[styles.predMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {isActive ? 'Active' : 'Closed'}
                      {mode ? ` · ${mode.toUpperCase()}` : ''}
                      {' · '}
                      {formatUsd(pnl)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={[styles.walletCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet Snapshot</Text>
            <View style={styles.walletRow}>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>Binance</Text>
              <Text style={[styles.walletValue, { color: colors.text }]}>{wallet?.binance == null ? 'Not connected' : formatUsd(wallet.binance)}</Text>
            </View>
            <View style={styles.walletRow}>
              <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>CoinDCX</Text>
              <Text style={[styles.walletValue, { color: colors.text }]}>{wallet?.coindcx == null ? 'Not connected' : formatUsd(wallet.coindcx)}</Text>
            </View>
          </View>

          <View style={[styles.quickActions, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <ActionButton label="Paper Trade" onPress={() => nav.navigate('Paper')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Stats" onPress={() => nav.navigate('Stats')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Market" onPress={() => nav.navigate('Market')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Chart" onPress={() => nav.navigate('Chart')} textColor={colors.text} border={glassBorder} />
              <ActionButton label="Create Bot" onPress={() => setShowCreateBotModal(true)} textColor={colors.text} border={glassBorder} />
            </View>
          </View>
        </View>
      ) : null}
      <Modal visible={showCreateBotModal} transparent animationType="fade" onRequestClose={() => setShowCreateBotModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Bot</Text>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.modalRow}>
              <ChoiceButton label="Adaptive" active={deployType === 'adaptive'} onPress={() => setDeployType('adaptive')} />
              <ChoiceButton label="By Segment" active={deployType === 'segments'} onPress={() => setDeployType('segments')} />
            </View>

            {deployType === 'segments' ? (
              <View style={styles.segmentWrap}>
                {SEGMENT_OPTIONS.map((segment) => (
                  <Pressable
                    key={segment}
                    onPress={() => toggleSegment(segment)}
                    style={[
                      styles.segmentChip,
                      {
                        borderColor: selectedSegments.includes(segment) ? neon.cyan : glassBorder,
                        backgroundColor: selectedSegments.includes(segment) ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: selectedSegments.includes(segment) ? neon.cyan : colors.text }}>{segment}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Exchange</Text>
            <View style={styles.modalRow}>
              <ChoiceButton label="Binance" active={deployExchange === 'binance'} onPress={() => setDeployExchange('binance')} />
              <ChoiceButton label="CoinDCX" active={deployExchange === 'coindcx'} onPress={() => setDeployExchange('coindcx')} />
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Mode</Text>
            <View style={styles.modalRow}>
              <ChoiceButton label="Paper" active={deployMode === 'paper'} onPress={() => setDeployMode('paper')} />
              <ChoiceButton label="Live" active={deployMode === 'live'} onPress={() => setDeployMode('live')} />
            </View>

            <View style={styles.modalRow}>
              <View style={styles.inputCol}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Max Trades</Text>
                <TextInput
                  value={String(deployMaxTrades)}
                  onChangeText={(v) => setDeployMaxTrades(Math.max(1, parseInt(v || '1', 10) || 1))}
                  keyboardType="numeric"
                  style={[styles.modalInput, { color: colors.text, borderColor: glassBorder }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Capital/Trade</Text>
                <TextInput
                  value={String(deployCapitalPerTrade)}
                  onChangeText={(v) => setDeployCapitalPerTrade(Math.max(10, parseInt(v || '10', 10) || 10))}
                  keyboardType="numeric"
                  style={[styles.modalInput, { color: colors.text, borderColor: glassBorder }]}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCreateBotModal(false)}
                style={({ pressed }) => [styles.modalBtn, { borderColor: glassBorder, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreateBots()}
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnPrimary, { opacity: pressed || creatingBot ? 0.85 : 1 }]}
              >
                <Text style={{ color: '#02131F', fontWeight: '800' }}>{creatingBot ? 'Creating...' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showEditBotModal} transparent animationType="fade" onRequestClose={() => setShowEditBotModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Bot</Text>
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Mode</Text>
            <View style={styles.modalRow}>
              <ChoiceButton label="Paper" active={editMode === 'paper'} onPress={() => setEditMode('paper')} />
              <ChoiceButton label="Live" active={editMode === 'live'} onPress={() => setEditMode('live')} />
            </View>
            <View style={styles.modalRow}>
              <View style={styles.inputCol}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Max Trades</Text>
                <TextInput
                  value={String(editMaxTrades)}
                  onChangeText={(v) => setEditMaxTrades(Math.max(1, parseInt(v || '1', 10) || 1))}
                  keyboardType="numeric"
                  style={[styles.modalInput, { color: colors.text, borderColor: glassBorder }]}
                />
              </View>
              <View style={styles.inputCol}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Capital/Trade</Text>
                <TextInput
                  value={String(editCapitalPerTrade)}
                  onChangeText={(v) => setEditCapitalPerTrade(Math.max(10, parseInt(v || '10', 10) || 10))}
                  keyboardType="numeric"
                  style={[styles.modalInput, { color: colors.text, borderColor: glassBorder }]}
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEditBotModal(false)}
                style={({ pressed }) => [styles.modalBtn, { borderColor: glassBorder, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSaveBotEdit()}
                style={({ pressed }) => [styles.modalBtn, styles.modalBtnPrimary, { opacity: pressed || savingEdit ? 0.85 : 1 }]}
              >
                <Text style={{ color: '#02131F', fontWeight: '800' }}>{savingEdit ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  tone,
  bg,
  border,
  text,
}: {
  label: string;
  value: string;
  tone: string;
  bg: string;
  border: string;
  text: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.statLabel, { color: tone }]}>{label}</Text>
      <Text style={[styles.statValue, { color: text }]}>{value}</Text>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.rowKV}>
      <Text style={[styles.kvLabel, { color }]}>{label}</Text>
      <Text style={[styles.kvValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  textColor,
  border,
}: {
  label: string;
  onPress: () => void;
  textColor: string;
  border: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, { borderColor: border, opacity: pressed ? 0.8 : 1 }]}>
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function ChoiceButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceBtn, active ? styles.choiceBtnActive : null]}>
      <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  heroCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  heroTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, lineHeight: 19 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800' },

  walletCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  walletRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { fontSize: 13, fontWeight: '600' },
  walletValue: { fontSize: 13, fontWeight: '700' },

  engineCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  kpiRow: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiText: { fontSize: 12, fontWeight: '700' },
  predRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  predSymbol: { fontSize: 14, fontWeight: '800', width: 72 },
  predSide: { fontSize: 12, fontWeight: '800', width: 54, textAlign: 'right' },
  predMeta: { fontSize: 12, fontWeight: '600', flex: 1 },
  rowKV: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kvLabel: { fontSize: 12, fontWeight: '600' },
  kvValue: { fontSize: 12, fontWeight: '700' },

  // Bots mini-cards
  botGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any, marginTop: 6 },
  botCard: { borderWidth: 1, borderRadius: 12, padding: 10, width: '48%' },
  botTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  botMeta: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  botPnl: { fontSize: 14, fontWeight: '800' },
  botRowWrap: { gap: 8 },
  botActionRow: { flexDirection: 'row', gap: 8 as any },
  botActionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  botTradesPanel: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  botTradesEmpty: {
    fontSize: 12,
    fontWeight: '600',
  },
  botTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 as any,
  },
  botTradeSym: { fontSize: 12, fontWeight: '800', width: 72 },
  botTradeSide: { fontSize: 11, fontWeight: '800', width: 54, textAlign: 'right' },
  botTradeStatus: { fontSize: 10, fontWeight: '700', width: 58, textAlign: 'right' },
  botTradePnl: { fontSize: 12, fontWeight: '800', flex: 1, textAlign: 'right' },

  // Heatmap
  heatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginTop: 6 },
  heatCell: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, width: '48%' },
  heatName: { fontSize: 12, fontWeight: '800' },
  heatVal: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Market structure tiles
  msGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 as any, marginTop: 6 },
  msCard: { borderWidth: 1, borderRadius: 12, padding: 12, width: '48%' },
  msTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  msValue: { fontSize: 18, fontWeight: '800' },

  // Brain Execution Summary counters
  besRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 as any, marginBottom: 6 },
  besCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', flex: 1 },
  besLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  besValue: { fontSize: 20, fontWeight: '800' },

  // Signal queue
  queueBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  queueTitle: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  queueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  queueSym: { fontSize: 12, fontWeight: '800', width: 70 },
  queueSide: { fontSize: 12, fontWeight: '800', width: 54, textAlign: 'right' },
  queueConv: { fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' },

  signalQueueCard: { gap: 10 },
  signalQueueTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  sigQRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8 as any,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  sigQSym: { fontSize: 14, fontWeight: '800', minWidth: 56 },
  sigQSide: { fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  sigQConv: { fontSize: 12, fontWeight: '800' },
  sigQTtl: { fontSize: 10, fontWeight: '600', marginLeft: 'auto' },

  pipelineHint: { fontSize: 11, marginBottom: 8, lineHeight: 16 },
  pipelineScroll: { maxHeight: 440 },
  pipelineRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  pipelineRowTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 as any },
  pipelineIdx: { fontSize: 10, fontWeight: '700', width: 22 },
  pipelineCoin: { fontSize: 15, fontWeight: '800', minWidth: 48 },
  pipelineSeg: { fontSize: 11, fontWeight: '700', flex: 1, minWidth: 52 },
  stageBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 120 },
  stageBadgeText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  pipelineRegime: { fontSize: 11, lineHeight: 15 },
  pipelineRowMid: { flexDirection: 'row', alignItems: 'center' },
  pipelineConv: { fontSize: 14, fontWeight: '800' },
  pipelineReason: { fontSize: 11, lineHeight: 15 },

  quickActions: { borderWidth: 1, borderRadius: 14, padding: 14 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginTop: 8 },
  actionBtn: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionText: { fontSize: 13, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  modalRow: { flexDirection: 'row', gap: 8 as any },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  choiceBtnActive: {
    borderColor: '#22D3EE',
    backgroundColor: 'rgba(34,211,238,0.14)',
  },
  choiceText: { color: '#CBD5E1', fontWeight: '700', fontSize: 12 },
  choiceTextActive: { color: '#22D3EE' },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 as any, marginTop: 2, marginBottom: 4 },
  segmentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  inputCol: { flex: 1, gap: 4 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
  },
  modalActions: { flexDirection: 'row', gap: 8 as any, marginTop: 8 },
  modalBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    borderColor: '#22D3EE',
    backgroundColor: '#22D3EE',
  },
});
