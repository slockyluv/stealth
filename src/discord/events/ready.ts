import type { Client } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { snapshotGuildInvites } from '../services/inviteTracker.js';

export async function ready(client: Client) {
  if (!client.user) return;
  logger.info(`Logged in as ${client.user.tag}`);

  const tasks: Promise<void>[] = [];
  for (const guild of client.guilds.cache.values()) {
    tasks.push(snapshotGuildInvites(guild));
  }

  await Promise.all(tasks);
}