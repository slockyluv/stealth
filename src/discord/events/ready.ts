import type { Client } from 'discord.js';
import { logger } from '../../shared/logger.js';

export function ready(client: Client) {
  if (!client.user) return;
  logger.info(`Logged in as ${client.user.tag}`);
}