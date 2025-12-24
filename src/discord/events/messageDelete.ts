import { AuditLogEvent, type Message, type PartialMessage } from 'discord.js';
import { fetchAuditEntry } from '../services/auditLog.js';
import { logMessageDelete } from '../services/actionLogger.js';
import { logger } from '../../shared/logger.js';

export async function messageDelete(message: Message | PartialMessage) {
  
  try {
    if (message.partial) {
      message = await message.fetch();
    }
  } catch (error) {
    logger.error(error);
  }

  if (!message.guild) return;
  const guild = message.guild;
  const authorId = message.author?.id;
  if (!authorId) return;

  const content = message.content ?? '';

  const audit = await fetchAuditEntry({
    guild,
    type: AuditLogEvent.MessageDelete,
    targetId: authorId,
    withinMs: 20000,
    predicate: (entry) => {
      const extra = entry.extra as { channel?: { id?: string }; channelId?: string } | undefined;
      const channelId = extra?.channel?.id ?? extra?.channelId;
      return channelId === message.channelId;
    }
  });

  const deletedById = audit?.executorId ?? authorId;

  await logMessageDelete({
    guild,
    authorId,
    channelId: message.channelId,
    content,
    deletedById,
    deletedAt: new Date()
  });
}