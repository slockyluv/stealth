import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { logger } from '../shared/logger.js';

export type ActionLogCategory = 'moderation' | 'roles' | 'messages' | 'traffic' | 'economy';

export type ActionLogSettings = {
  moderationChannelId: string | null;
  moderationUpdatedBy: string | null;
  rolesChannelId: string | null;
  rolesUpdatedBy: string | null;
  messagesChannelId: string | null;
  messagesUpdatedBy: string | null;
  trafficChannelId: string | null;
  trafficUpdatedBy: string | null;
  economyChannelId: string | null;
  economyUpdatedBy: string | null;
};

function mapRecord(record: {
  moderationChannelId: bigint | null;
  moderationUpdatedBy: bigint | null;
  rolesChannelId: bigint | null;
  rolesUpdatedBy: bigint | null;
  messagesChannelId: bigint | null;
  messagesUpdatedBy: bigint | null;
  trafficChannelId: bigint | null;
  trafficUpdatedBy: bigint | null;
  economyChannelId: bigint | null;
  economyUpdatedBy: bigint | null;
}): ActionLogSettings {
  return {
    moderationChannelId: record.moderationChannelId?.toString() ?? null,
    moderationUpdatedBy: record.moderationUpdatedBy?.toString() ?? null,
    rolesChannelId: record.rolesChannelId?.toString() ?? null,
    rolesUpdatedBy: record.rolesUpdatedBy?.toString() ?? null,
    messagesChannelId: record.messagesChannelId?.toString() ?? null,
    messagesUpdatedBy: record.messagesUpdatedBy?.toString() ?? null,
    trafficChannelId: record.trafficChannelId?.toString() ?? null,
    trafficUpdatedBy: record.trafficUpdatedBy?.toString() ?? null,
    economyChannelId: record.economyChannelId?.toString() ?? null,
    economyUpdatedBy: record.economyUpdatedBy?.toString() ?? null
  };
}

export async function getActionLogSettings(guildId: string): Promise<ActionLogSettings> {
  const id = BigInt(guildId);

  try {
    const record = await prisma.actionLogSetting.findUnique({
      where: { guildId: id },
      select: {
        moderationChannelId: true,
        moderationUpdatedBy: true,
        rolesChannelId: true,
        rolesUpdatedBy: true,
        messagesChannelId: true,
        messagesUpdatedBy: true,
        trafficChannelId: true,
        trafficUpdatedBy: true,
        economyChannelId: true,
        economyUpdatedBy: true
      }
    });

    if (!record) {
      return {
        moderationChannelId: null,
        moderationUpdatedBy: null,
        rolesChannelId: null,
        rolesUpdatedBy: null,
        messagesChannelId: null,
        messagesUpdatedBy: null,
        trafficChannelId: null,
        trafficUpdatedBy: null,
        economyChannelId: null,
        economyUpdatedBy: null
      };
    }

    return mapRecord(record);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      logger.info('ActionLogSetting table is missing. Apply Prisma migrations.');
      return {
        moderationChannelId: null,
        moderationUpdatedBy: null,
        rolesChannelId: null,
        rolesUpdatedBy: null,
        messagesChannelId: null,
        messagesUpdatedBy: null,
        trafficChannelId: null,
        trafficUpdatedBy: null,
        economyChannelId: null,
        economyUpdatedBy: null
      };
    }

    logger.error(error);
    throw error;
  }
}

export async function setActionLogChannel(options: {
  guildId: string;
  category: ActionLogCategory;
  channelId: string | null;
  adminId: string | null;
}): Promise<ActionLogSettings> {
  const { guildId, category, channelId, adminId } = options;
  const id = BigInt(guildId);

  const channel = channelId ? BigInt(channelId) : null;
  const admin = adminId ? BigInt(adminId) : null;

  const data: Record<string, bigint | null> = {};
  data[`${category}ChannelId`] = channel;
  data[`${category}UpdatedBy`] = admin;

  try {
    const record = await prisma.actionLogSetting.upsert({
      where: { guildId: id },
      create: { guildId: id, ...data },
      update: data
    });

    return mapRecord(record);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      logger.info('ActionLogSetting table is missing. Apply Prisma migrations.');
      throw new Error('ACTION_LOG_SETTING_TABLE_MISSING');
    }

    logger.error(error);
    throw error;
  }
}