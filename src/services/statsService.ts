import { prisma } from '../database/prisma.js';
import { getXpToNextLevel } from './levelService.js';

export type GuildUserStats = {
  level: number;
  xp: number;
  xpToNext: number;
  xpRemaining: number;
  streakDays: number;
  totalMessageCount: number;
  totalVoiceMinutes: number;
  messageRank: number;
};

export async function getGuildUserStats(guildId: string, userId: string): Promise<GuildUserStats> {
  const guildIdBig = BigInt(guildId);
  const userIdBig = BigInt(userId);

  const guildUser = await prisma.guildUserLevel.upsert({
    where: { guildId_userId: { guildId: guildIdBig, userId: userIdBig } },
    update: {},
    create: {
      guildId: guildIdBig,
      userId: userIdBig
    }
  });

  const xp = Number(guildUser.xp);
  const xpToNext = getXpToNextLevel(guildUser.level);
  const xpRemaining = Math.max(0, Math.ceil(xpToNext - xp));

  const messageRank =
    (await prisma.guildUserLevel.count({
      where: {
        guildId: guildIdBig,
        totalMessageCount: { gt: guildUser.totalMessageCount }
      }
    })) + 1;

  return {
    level: guildUser.level,
    xp,
    xpToNext,
    xpRemaining,
    streakDays: guildUser.streakDays,
    totalMessageCount: guildUser.totalMessageCount,
    totalVoiceMinutes: guildUser.totalVoiceMinutes,
    messageRank
  };
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const timeoutMs = 9000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Image fetch timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}