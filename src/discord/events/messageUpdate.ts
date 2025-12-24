import type { Message, PartialMessage } from 'discord.js';
import { logMessageEdit } from '../services/actionLogger.js';
import { logger } from '../../shared/logger.js';

export async function messageUpdate(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
  if (newMessage.author?.bot) return;

  try {
    if (oldMessage.partial) {
      oldMessage = await oldMessage.fetch();
    }
    if (newMessage.partial) {
      newMessage = await newMessage.fetch();
    }
  } catch (error) {
    logger.error(error);
    return;
  }

  if (!newMessage.guild || !newMessage.author) return;

  if (oldMessage.content === newMessage.content) return;
  if (!newMessage.content && !oldMessage.content) return;

  const before = oldMessage.content ?? '';
  const editedAt = newMessage.editedAt ?? new Date();

  await logMessageEdit({
    guild: newMessage.guild,
    authorId: newMessage.author.id,
    channelId: newMessage.channelId,
    before,
    editedAt
  });
}