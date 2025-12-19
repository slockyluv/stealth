import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { logger } from '../shared/logger.js';

export function normalizeEmojiColor(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(normalized)) return null;

  return normalized.toUpperCase();
}

export async function getEmojiColor(guildId: string): Promise<string | null> {
  const id = BigInt(guildId);

  try {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: id },
      select: { emojiColor: true }
    });

    return settings?.emojiColor ?? null;
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      logger.info('GuildSettings table is missing. Apply Prisma migrations.');
      return null;
    }

    logger.error(error);
    throw error;
  }
}

export async function setEmojiColor(guildId: string, color: string | null): Promise<void> {
  const id = BigInt(guildId);

  try {
    await prisma.guildSettings.upsert({
      where: { guildId: id },
      update: { emojiColor: color },
      create: { guildId: id, emojiColor: color }
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      logger.info('GuildSettings table is missing. Apply Prisma migrations.');
      throw new Error('GUILD_SETTINGS_TABLE_MISSING');
    }

    logger.error(error);
    throw error;
  }
}