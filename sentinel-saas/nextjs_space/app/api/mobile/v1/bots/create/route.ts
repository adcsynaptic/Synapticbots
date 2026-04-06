import prisma from '@/lib/prisma';
import { requireMobileUser } from '@/lib/mobile-request';
import { mobileError, mobileOk } from '@/lib/mobile-response';
import { checkSubscription, TIER_LIMITS } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const DEFAULT_COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];

type CreateDeployment = {
  name?: string;
  segment?: string;
  coinList?: string[];
};

type CreatePayload = {
  name?: string;
  exchange?: string;
  mode?: string;
  maxTrades?: number;
  capitalPerTrade?: number;
  deployments?: CreateDeployment[];
};

export async function POST(request: Request) {
  try {
    const mobileUser = await requireMobileUser();
    if (!mobileUser) return mobileError('UNAUTHORIZED', 'Missing or invalid token', 401);

    const subStatus = await checkSubscription(mobileUser.id);
    if (!subStatus.isActive) return mobileError('FORBIDDEN', subStatus.message, 403);

    const body = (await request.json()) as CreatePayload;
    const { name, exchange, mode, maxTrades, capitalPerTrade, deployments } = body;

    if (!exchange || !Array.isArray(deployments) || deployments.length === 0) {
      return mobileError('BAD_REQUEST', 'Missing required fields or empty deployments list.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: mobileUser.id },
      include: { subscription: true, bots: true },
    });
    if (!user) return mobileError('UNAUTHORIZED', 'User not found', 401);

    const maxBots = TIER_LIMITS[subStatus.tier].maxBots;
    if (user.bots.length + deployments.length > maxBots) {
      return mobileError(
        'BOT_LIMIT_EXCEEDED',
        `Bot limit exceeded. You have ${user.bots.length}/${maxBots} bots. Cannot add ${deployments.length} more.`,
        403
      );
    }

    const coinScansLimit = user.subscription?.coinScans || 5;
    const botMode = mode || 'paper';
    const botMaxTrades = maxTrades || 25;
    const botCapitalPerTrade = capitalPerTrade || 100;

    const createdBots = await prisma.$transaction(
      deployments.map((dep) => {
        const candidateCoins = Array.isArray(dep.coinList) && dep.coinList.length > 0 ? dep.coinList : DEFAULT_COINS;
        const finalizedCoins = candidateCoins.slice(0, coinScansLimit);
        const segment = dep.segment || 'ALL';

        return prisma.bot.create({
          data: {
            userId: mobileUser.id,
            name: dep.name || name || `Bot - ${segment}`,
            exchange,
            status: 'stopped',
            isActive: false,
            startedAt: new Date(),
            config: {
              create: {
                mode: botMode,
                capitalPerTrade: botCapitalPerTrade,
                maxOpenTrades: botMaxTrades,
                slMultiplier: 0.8,
                tpMultiplier: 1.0,
                maxLossPct: -15,
                multiTargetEnabled: true,
                t1Multiplier: 0.5,
                t2Multiplier: 1.0,
                t3Multiplier: 1.5,
                t1BookPct: 0.25,
                t2BookPct: 0.5,
                brainType: segment === 'ALL' ? 'adaptive' : 'specialist',
                segment,
                coinList: finalizedCoins,
              },
            },
            state: {
              create: { engineStatus: 'idle' },
            },
          },
          include: { config: true, state: true },
        });
      })
    );

    return mobileOk({ count: createdBots.length, bots: createdBots });
  } catch (error) {
    console.error('Mobile bot creation error:', error);
    return mobileError('INTERNAL_ERROR', 'Failed to create bot', 500);
  }
}
