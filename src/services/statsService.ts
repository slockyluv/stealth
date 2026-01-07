import { prisma } from '../database/prisma.js';
import { getXpToNextLevel } from './levelService.js';

export type GuildUserStats = {
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
  totalMessageCount: number;
  totalVoiceMinutes: number;
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

  return {
    level: guildUser.level,
    xp,
    xpToNext: getXpToNextLevel(guildUser.level),
    streakDays: guildUser.streakDays,
    totalMessageCount: guildUser.totalMessageCount,
    totalVoiceMinutes: guildUser.totalVoiceMinutes
  };
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}