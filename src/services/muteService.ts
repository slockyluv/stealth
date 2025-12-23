import { prisma } from '../database/prisma.js';

export type MuteRecord = {
  id: bigint;
  guildId: bigint;
  userId: bigint;
  moderatorId: bigint;
  reason: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export async function upsertMute(options: {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason?: string;
  expiresAt: Date;
}): Promise<MuteRecord> {
  const { guildId, userId, moderatorId, reason, expiresAt } = options;

  return prisma.mute.upsert({
    where: {
      guildId_userId: {
        guildId: BigInt(guildId),
        userId: BigInt(userId)
      }
    },
    create: {
      guildId: BigInt(guildId),
      userId: BigInt(userId),
      moderatorId: BigInt(moderatorId),
      reason: reason ?? null,
      expiresAt
    },
    update: {
      moderatorId: BigInt(moderatorId),
      reason: reason ?? null,
      expiresAt
    }
  });
}

export async function clearMute(options: { guildId: string; userId: string }): Promise<void> {
  const { guildId, userId } = options;

  await prisma.mute.deleteMany({
    where: {
      guildId: BigInt(guildId),
      userId: BigInt(userId)
    }
  });
}

export async function clearExpiredMutes(options: { guildId: string; now: Date }): Promise<void> {
  const { guildId, now } = options;

  await prisma.mute.deleteMany({
    where: {
      guildId: BigInt(guildId),
      expiresAt: {
        lte: now
      }
    }
  });
}

export async function listMutes(guildId: string): Promise<MuteRecord[]> {
  return prisma.mute.findMany({
    where: {
      guildId: BigInt(guildId)
    },
    orderBy: {
      expiresAt: 'asc'
    }
  });
}