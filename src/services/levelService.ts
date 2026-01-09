import type { Client, VoiceState } from 'discord.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { logger } from '../shared/logger.js';

const MIN_MESSAGE_LENGTH = 4;
const VOICE_XP_PER_MINUTE = 6;
const VOICE_XP_TICK_MS = 60_000;
const MESSAGE_XP_MIN = 2.8;
const MESSAGE_XP_MAX = 3.2;
const MESSAGE_XP_DECAY = 0.0004;
let voiceXpTicker: NodeJS.Timeout | null = null;

function getDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getXpToNextLevel(level: number) {
  return 1800 + level * 220;
}

function computeMessageXp(messageCountToday: number) {
  return Math.max(MESSAGE_XP_MAX - messageCountToday * MESSAGE_XP_DECAY, MESSAGE_XP_MIN);
}

function computeStreakBonus(streakDays: number) {
  return 150 + Math.min(350, Math.floor(25 * Math.log2(streakDays + 1)));
}

function applyLevelProgress(currentXp: number, currentLevel: number, earnedXp: number) {
  let xp = currentXp + earnedXp;
  let level = currentLevel;
  while (xp >= getXpToNextLevel(level)) {
    xp -= getXpToNextLevel(level);
    level += 1;
  }
  return { xp, level };
}

async function ensureDailyStats(tx: Prisma.TransactionClient, guildId: bigint, userId: bigint, now: Date) {
  const today = getDayStart(now);
  const latestDaily = await tx.guildUserDailyStat.findFirst({
    where: { guildId, userId },
    orderBy: { date: 'desc' }
  });

  let streakReset = false;
  if (latestDaily && latestDaily.date.getTime() !== today.getTime() && !latestDaily.qualified) {
    streakReset = true;
  }

  const daily =
    latestDaily && latestDaily.date.getTime() === today.getTime()
      ? latestDaily
      : await tx.guildUserDailyStat.create({
          data: {
            guildId,
            userId,
            date: today
          }
        });

  return { daily, streakReset };
}

async function applyStreakIfQualified(
  tx: Prisma.TransactionClient,
  guildId: bigint,
  userId: bigint,
  daily: { id: bigint; messageCount: number; voiceMinutes: number; qualified: boolean; bonusGranted: boolean },
  streakDays: number,
  maxStreakDays: number
) {
  if (daily.bonusGranted) {
    return {
      bonusXp: 0,
      updatedStreakDays: streakDays,
      updatedMaxStreakDays: maxStreakDays,
      qualified: daily.qualified,
      bonusGranted: true
    };
  }

  const qualifies = daily.qualified || daily.messageCount >= 150 || daily.voiceMinutes >= 120;
  if (!qualifies) {
    return {
      bonusXp: 0,
      updatedStreakDays: streakDays,
      updatedMaxStreakDays: maxStreakDays,
      qualified: daily.qualified,
      bonusGranted: false
    };
  }

  const bonusXp = computeStreakBonus(streakDays);
  const updatedStreakDays = streakDays + 1;
  const updatedMaxStreakDays = Math.max(maxStreakDays, updatedStreakDays);

  await tx.guildUserDailyStat.update({
    where: { id: daily.id },
    data: {
      qualified: true,
      bonusGranted: true
    }
  });

  await tx.guildUserLevel.update({
    where: { guildId_userId: { guildId, userId } },
    data: {
      streakDays: updatedStreakDays,
      maxStreakDays: updatedMaxStreakDays
    }
  });

  return {
    bonusXp,
    updatedStreakDays,
    updatedMaxStreakDays,
    qualified: true,
    bonusGranted: true
  };
}

export async function recordMessageActivity(guildId: string, userId: string, content: string) {
  const trimmed = content.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH) return;

  const guildIdBig = BigInt(guildId);
  const userIdBig = BigInt(userId);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const guildUser = await tx.guildUserLevel.upsert({
      where: { guildId_userId: { guildId: guildIdBig, userId: userIdBig } },
      update: {},
      create: {
        guildId: guildIdBig,
        userId: userIdBig
      }
    });

    if (guildUser.lastMessageContent && guildUser.lastMessageContent === trimmed) {
      return;
    }

    const { daily, streakReset } = await ensureDailyStats(tx, guildIdBig, userIdBig, now);

    let streakDays = guildUser.streakDays;
    const maxStreakDays = guildUser.maxStreakDays;
    if (streakReset) {
      streakDays = 0;
      await tx.guildUserLevel.update({
        where: { guildId_userId: { guildId: guildIdBig, userId: userIdBig } },
        data: { streakDays }
      });
    }

    const messageXp = computeMessageXp(daily.messageCount);

    const updatedDaily = await tx.guildUserDailyStat.update({
      where: { id: daily.id },
      data: {
        messageCount: { increment: 1 }
      }
    });

    const streakResult = await applyStreakIfQualified(
      tx,
      guildIdBig,
      userIdBig,
      updatedDaily,
      streakDays,
      maxStreakDays
    );

    const currentXp = new Prisma.Decimal(guildUser.xp).toNumber();
    const currentLevel = guildUser.level;
    const earnedXp = messageXp + streakResult.bonusXp;
    const progress = applyLevelProgress(currentXp, currentLevel, earnedXp);

    await tx.guildUserLevel.update({
      where: { guildId_userId: { guildId: guildIdBig, userId: userIdBig } },
      data: {
        xp: new Prisma.Decimal(progress.xp),
        level: progress.level,
        totalMessageCount: { increment: 1 },
        lastMessageContent: trimmed,
        lastMessageAt: now
      }
    });
  });
}

async function applyVoiceMinutes(guildId: bigint, userId: bigint, minutes: number, now: Date) {
  if (minutes <= 0) return;

  await prisma.$transaction(async (tx) => {
    const guildUser = await tx.guildUserLevel.upsert({
      where: { guildId_userId: { guildId, userId } },
      update: {},
      create: {
        guildId,
        userId
      }
    });

    const { daily, streakReset } = await ensureDailyStats(tx, guildId, userId, now);

    let streakDays = guildUser.streakDays;
    const maxStreakDays = guildUser.maxStreakDays;
    if (streakReset) {
      streakDays = 0;
      await tx.guildUserLevel.update({
        where: { guildId_userId: { guildId, userId } },
        data: { streakDays }
      });
    }

    const updatedDaily = await tx.guildUserDailyStat.update({
      where: { id: daily.id },
      data: {
        voiceMinutes: { increment: minutes }
      }
    });

    const streakResult = await applyStreakIfQualified(
      tx,
      guildId,
      userId,
      updatedDaily,
      streakDays,
      maxStreakDays
    );

    const earnedXp = minutes * VOICE_XP_PER_MINUTE + streakResult.bonusXp;
    const currentXp = new Prisma.Decimal(guildUser.xp).toNumber();
    const currentLevel = guildUser.level;
    const progress = applyLevelProgress(currentXp, currentLevel, earnedXp);

    await tx.guildUserLevel.update({
      where: { guildId_userId: { guildId, userId } },
      data: {
        xp: new Prisma.Decimal(progress.xp),
        level: progress.level,
        totalVoiceMinutes: { increment: minutes }
      }
    });
  });
}

async function processEligibleVoiceSessions(now = new Date()) {
  const cutoff = new Date(now.getTime() - VOICE_XP_TICK_MS);
  const sessions = await prisma.guildUserVoiceSession.findMany({
    where: { eligibleSince: { not: null, lte: cutoff } }
  });

  const updates = sessions.map(async (session) => {
    if (!session.eligibleSince) return;
    const elapsedMs = now.getTime() - session.eligibleSince.getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    if (minutes <= 0) return;

    await applyVoiceMinutes(session.guildId, session.userId, minutes, now);

    const updatedEligibleSince = new Date(session.eligibleSince.getTime() + minutes * 60000);
    await prisma.guildUserVoiceSession.update({
      where: { guildId_userId: { guildId: session.guildId, userId: session.userId } },
      data: { eligibleSince: updatedEligibleSince }
    });
  });

  await Promise.allSettled(updates);
}

function getEligibleVoiceChannel(state: VoiceState) {
  const channel = state.channel;
  if (!channel || !channel.isVoiceBased()) return null;
  const guild = state.guild;
  if (guild.afkChannelId && channel.id === guild.afkChannelId) return null;
  return channel;
}

async function finalizeVoiceSession(guildId: bigint, userId: bigint, now: Date) {
  const session = await prisma.guildUserVoiceSession.findUnique({
    where: { guildId_userId: { guildId, userId } }
  });
  if (!session) return;

  if (session.eligibleSince) {
    const elapsedMs = now.getTime() - session.eligibleSince.getTime();
    const minutes = Math.floor(elapsedMs / 60000);
    await applyVoiceMinutes(guildId, userId, minutes, now);
  }

  await prisma.guildUserVoiceSession.delete({
    where: { guildId_userId: { guildId, userId } }
  });
}

async function updateChannelEligibility(channel: ReturnType<typeof getEligibleVoiceChannel> | null, now: Date) {
  if (!channel) return;
  const guildId = BigInt(channel.guild.id);
  const nonBotMembers = channel.members.filter((member) => !member.user.bot);
  const isEligible = nonBotMembers.size >= 2;

  const updates = Array.from(nonBotMembers.values()).map(async (member) => {
    const userId = BigInt(member.id);
    const session = await prisma.guildUserVoiceSession.upsert({
      where: { guildId_userId: { guildId, userId } },
      update: {},
      create: {
        guildId,
        userId,
        channelId: BigInt(channel.id),
        joinedAt: now,
        eligibleSince: null
      }
    });

    if (isEligible && !session.eligibleSince) {
      await prisma.guildUserVoiceSession.update({
        where: { guildId_userId: { guildId, userId } },
        data: { eligibleSince: now }
      });
      return;
    }

    if (!isEligible && session.eligibleSince) {
      const elapsedMs = now.getTime() - session.eligibleSince.getTime();
      const minutes = Math.floor(elapsedMs / 60000);
      await applyVoiceMinutes(guildId, userId, minutes, now);
      await prisma.guildUserVoiceSession.update({
        where: { guildId_userId: { guildId, userId } },
        data: { eligibleSince: null }
      });
    }
  });

  await Promise.allSettled(updates);
}

export async function syncActiveVoiceSessions(client: Client) {
  const now = new Date();
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased()) continue;
      if (guild.afkChannelId && channel.id === guild.afkChannelId) continue;
      if (channel.members.size === 0) continue;
      await updateChannelEligibility(channel, now);
    }
  }
}

export function startVoiceXpTicker() {
  if (voiceXpTicker) return;
  voiceXpTicker = setInterval(() => {
    processEligibleVoiceSessions().catch((error) => logger.error(error));
  }, VOICE_XP_TICK_MS);
}

export async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  try {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const now = new Date();
    const oldChannel = getEligibleVoiceChannel(oldState);
    const newChannel = getEligibleVoiceChannel(newState);

    const guildId = BigInt((newState.guild ?? oldState.guild).id);
    const userId = BigInt(member.id);

    if (oldChannel?.id !== newChannel?.id) {
      if (oldChannel) {
        await finalizeVoiceSession(guildId, userId, now);
      }
      if (newChannel) {
        await prisma.guildUserVoiceSession.upsert({
          where: { guildId_userId: { guildId, userId } },
          update: {
            channelId: BigInt(newChannel.id),
            joinedAt: now,
            eligibleSince: null
          },
          create: {
            guildId,
            userId,
            channelId: BigInt(newChannel.id),
            joinedAt: now,
            eligibleSince: null
          }
        });
      }
    }

    await Promise.all([
      updateChannelEligibility(oldChannel, now),
      updateChannelEligibility(newChannel, now)
    ]);
  } catch (error) {
    logger.error(error);
  }
}