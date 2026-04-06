import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { checkSubscription, hasFeature } from '@/lib/subscription';
import { createBotSession, closeBotSession } from '@/lib/bot-session';
import { getEngineUrl } from '@/lib/engine-url';
import { buildCloseData } from '@/lib/trade-utils';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  try {
    const mobileUser = await requireMobileUser();
    if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

    const { botId, isActive } = await request.json();
    if (!botId) return mobileError('BAD_REQUEST', 'botId required', 400);

    if (isActive) {
      const subStatus = await checkSubscription(mobileUser.id);
      if (!subStatus.isActive) return mobileError('FORBIDDEN', subStatus.message, 403);
    }

    const bot = await prisma.bot.findFirst({
      where: { id: botId, userId: mobileUser.id },
      include: { config: true },
    });
    if (!bot) return mobileError('NOT_FOUND', 'Bot not found', 404);

    if (isActive) {
      const mode = (bot.config?.mode ?? 'paper').toLowerCase();
      if (mode.startsWith('live')) {
        const canTradeLive = await hasFeature(mobileUser.id, 'liveTrading');
        if (!canTradeLive) {
          return mobileError('FORBIDDEN', 'Live trading requires a Pro or Ultra subscription. Upgrade to continue.', 403);
        }
      }
      try {
        await createBotSession(botId, bot.config?.mode ?? 'paper');
      } catch (err) {
        console.error('[mobile-toggle] createBotSession failed:', err);
      }
    } else {
      try {
        await closeBotSession(botId);
      } catch (err) {
        console.error('[mobile-toggle] closeBotSession failed:', err);
      }

      const stopMode = (bot.config?.mode ?? 'paper').toLowerCase();
      const stopEngineUrl = getEngineUrl(stopMode.startsWith('live') ? 'live' : 'paper');
      if (stopEngineUrl) {
        try {
          await fetch(`${stopEngineUrl}/api/remove-bot-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot_id: botId }),
            signal: AbortSignal.timeout(5000),
          });
        } catch (err) {
          console.warn('[mobile-toggle] remove-bot-id failed (continuing):', err);
        }
      }

      const activeTrades = await prisma.trade.findMany({
        where: { botId, status: { in: ['active', 'ACTIVE', 'Active'] } },
      });
      for (const trade of activeTrades) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: buildCloseData(trade, 'BOT_STOPPED'),
        });
      }
    }

    const botMode = (bot.config?.mode ?? 'paper').toLowerCase();
    const engineUrl = getEngineUrl(botMode.startsWith('live') ? 'live' : 'paper');
    if (engineUrl && isActive) {
      try {
        await fetch(`${engineUrl}/api/set-bot-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bot_id: botId,
            bot_name: bot.name,
            user_id: mobileUser.id,
            brain_type: (bot.config as any)?.brainType || 'adaptive',
            segment_filter: (bot.config as any)?.segment || 'ALL',
            capital_per_trade: (bot.config as any)?.capitalPerTrade ?? 100,
            max_loss_pct: (bot.config as any)?.maxLossPct ?? -15,
          }),
          signal: AbortSignal.timeout(5000),
        });
      } catch (err) {
        console.warn('[mobile-toggle] set-bot-id failed (continuing):', err);
      }
    }

    try {
      const orchEndpoint = isActive ? 'start' : 'stop';
      await fetch(`${ORCHESTRATOR_URL}/api/bots/${orchEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
    } catch (err) {
      console.error('[mobile-toggle] orchestrator unreachable:', err);
    }

    await prisma.bot.update({
      where: { id: botId },
      data: {
        isActive: !!isActive,
        status: isActive ? 'running' : 'stopped',
        ...(isActive && !bot.startedAt ? { startedAt: new Date() } : {}),
        ...(!isActive ? { stoppedAt: new Date() } : {}),
      },
    });

    return mobileOk({ success: true, isActive: !!isActive });
  } catch (error) {
    console.error('Mobile bot toggle error:', error);
    return mobileError('INTERNAL_ERROR', 'Failed to toggle bot', 500);
  }
}
