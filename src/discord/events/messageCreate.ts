import type { Message, TextBasedChannel } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { upsertUser } from '../../services/userService.js';
import { COMMAND_PREFIX } from '../../config/bot.js';

async function safeReply(message: Message, content: string) {
  try {
    if (!message.channel?.isTextBased()) return;
    const channel = message.channel as TextBasedChannel;
    await channel.send({ content });
  } catch {
    // ignore
  }
}

export async function messageCreate(message: Message) {
  if (message.author.bot) return;

  void upsertUser(message.author.id).catch((err) => logger.error(err));

  const content = message.content.trim();
  if (!content.startsWith(COMMAND_PREFIX)) return;

  const withoutPrefix = content.slice(COMMAND_PREFIX.length).trim();
  if (!withoutPrefix) return;

  const [commandName, ...args] = withoutPrefix.split(/\s+/);
  if (!commandName) return;

  const command = message.client.commands.get(commandName.toLowerCase());
  if (!command?.executeMessage) {
    await safeReply(message, 'Команда не найдена.');
    return;
  }

  try {
    await command.executeMessage(message, args);
  } catch (err) {
    logger.error(err);
    await safeReply(message, 'Произошла ошибка при выполнении команды.');
  }
}