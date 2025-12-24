import {
  AuditLogEvent,
  type Guild,
  type GuildAuditLogsEntry,
  type GuildAuditLogsFetchOptions,
  type Snowflake
} from 'discord.js';
import { logger } from '../../shared/logger.js';

export async function fetchAuditEntry(options: {
  guild: Guild;
  type: AuditLogEvent;
  targetId?: Snowflake;
  withinMs?: number;
  predicate?: (entry: GuildAuditLogsEntry) => boolean;
}): Promise<GuildAuditLogsEntry | null> {
  const { guild, type, targetId, withinMs = 15000, predicate } = options;

  try {
    const fetchOptions: GuildAuditLogsFetchOptions<AuditLogEvent> = { type, limit: 5 };
    const logs = await guild.fetchAuditLogs(fetchOptions);
    const now = Date.now();

    for (const entry of logs.entries.values()) {
      if (targetId && entry.targetId !== targetId) continue;
      if (withinMs && Math.abs(now - entry.createdTimestamp) > withinMs) continue;
      if (predicate && !predicate(entry)) continue;
      return entry;
    }
  } catch (error) {
    logger.error(error);
  }

  return null;
}