import type { Client } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { snapshotGuildInvites } from '../../services/inviteTracker.js';
import { startVoiceXpTicker, syncActiveVoiceSessions } from '../../services/levelService.js';

export async function ready(client: Client) {
  if (!client.user) return;
  logger.info(`Logged in as ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    await snapshotGuildInvites(guild);
  }

  try {
    await syncActiveVoiceSessions(client);
  } catch (error) {
    logger.error(error);
  }

  startVoiceXpTicker();
}