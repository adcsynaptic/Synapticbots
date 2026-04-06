import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const mobileUser = await requireMobileUser();
    if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

    const botId = new URL(request.url).searchParams.get('botId');
    if (!botId) return mobileError('BAD_REQUEST', 'botId required', 400);

    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: mobileUser.id },
      include: { config: true, state: true },
    });
    if (!bot) return mobileError('NOT_FOUND', 'Bot not found', 404);

    return mobileOk({
      bot: {
        id: bot.id,
        name: bot.name,
        exchange: bot.exchange,
        status: bot.status,
        isActive: bot.isActive,
      },
      config: bot.config,
      state: bot.state
        ? {
            engineStatus: bot.state.engineStatus,
            lastCycleAt: bot.state.lastCycleAt?.toISOString() ?? null,
            cycleCount: bot.state.cycleCount,
            cycleDurationMs: bot.state.cycleDurationMs,
            errorMessage: bot.state.errorMessage,
          }
        : null,
    });
  } catch (error) {
    console.error('Mobile bot config GET error:', error);
    return mobileError('INTERNAL_ERROR', 'Failed to fetch config', 500);
  }
}

export async function PUT(request: Request) {
  try {
    const mobileUser = await requireMobileUser();
    if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

    const body = await request.json();
    const { botId, ...configData } = body;
    if (!botId) return mobileError('BAD_REQUEST', 'botId required', 400);

    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: mobileUser.id },
    });
    if (!bot) return mobileError('NOT_FOUND', 'Bot not found', 404);

    const allowed: Record<string, any> = {};
    const fields = [
      'mode',
      'capitalPerTrade',
      'maxOpenTrades',
      'slMultiplier',
      'tpMultiplier',
      'maxLossPct',
      'multiTargetEnabled',
      't1Multiplier',
      't2Multiplier',
      't3Multiplier',
      't1BookPct',
      't2BookPct',
      'coinList',
      'leverageTiers',
      'brainType',
    ];
    for (const f of fields) {
      if (configData[f] !== undefined) allowed[f] = configData[f];
    }

    const updated = await prisma.botConfig.upsert({
      where: { botId },
      update: allowed,
      create: { botId, ...allowed },
    });

    return mobileOk({ success: true, config: updated });
  } catch (error) {
    console.error('Mobile bot config PUT error:', error);
    return mobileError('INTERNAL_ERROR', 'Failed to update config', 500);
  }
}
