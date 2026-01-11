import type {
  Collection,
  Guild,
  GuildMember,
  GuildMemberManager,
  NonThreadGuildBasedChannel,
  Role
} from 'discord.js';
import { logger } from '../../shared/logger.js';

export async function getGuildMember(options: {
  guildMembers: GuildMemberManager;
  userId: string;
}): Promise<GuildMember | null> {
  const { guildMembers, userId } = options;
  const cached = guildMembers.cache.get(userId);
  if (cached) return cached;

  try {
    return await guildMembers.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function getGuildRole(options: {
  guild: Guild;
  roleId: string;
}): Promise<Role | null> {
  const { guild, roleId } = options;
  const cached = guild.roles.cache.get(roleId);
  if (cached) return cached;

  try {
    return await guild.roles.fetch(roleId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function getGuildRoles(guild: Guild): Promise<Collection<string, Role>> {
  if (guild.roles.cache.size > 0) {
    return guild.roles.cache;
  }

  try {
    return await guild.roles.fetch();
  } catch (error) {
    logger.error(error);
    return guild.roles.cache;
  }
}

export async function getGuildChannels(guild: Guild): Promise<Collection<string, NonThreadGuildBasedChannel>> {
  if (guild.channels.cache.size > 0) {
    return guild.channels.cache as Collection<string, NonThreadGuildBasedChannel>;
  }

  try {
    return (await guild.channels.fetch()) as Collection<string, NonThreadGuildBasedChannel>;
  } catch (error) {
    logger.error(error);
    return guild.channels.cache as Collection<string, NonThreadGuildBasedChannel>;
  }
}

export async function getSendableChannelById(guild: Guild, channelId: string | null) {
  if (!channelId) return null;

  const cached = guild.channels.cache.get(channelId);
  if (cached && cached.isSendable()) return cached;

  try {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isSendable()) return null;
    return channel;
  } catch (error) {
    logger.error(error);
    return null;
  }
}