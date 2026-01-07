import { MessageFlags, type Message } from 'discord.js';
import { logger } from '../../shared/logger.js';
import { upsertUser } from '../../services/userService.js';
import { recordMessageActivity } from '../../services/levelService.js';
import { COMMAND_PREFIX } from '../../config/bot.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';

async function safeReply(message: Message, content: string) {
  try {
    if (!message.channel?.isSendable()) return;
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });
    await message.channel.send({
      components: buildWarningView(formatEmoji, content),
      flags: MessageFlags.IsComponentsV2
    });
  } catch {
    // ignore
  }
}

export async function messageCreate(message: Message) {
  if (message.author.bot) return;

  const content = message.content.trim();
  const isCommand = content.startsWith(COMMAND_PREFIX);
  if (message.guildId && !isCommand) {
    void recordMessageActivity(message.guildId, message.author.id, content).catch((err) =>
      logger.error(err)
    );
  }

  if (!isCommand) return;

  const withoutPrefix = content.slice(COMMAND_PREFIX.length).trim();
  if (!withoutPrefix) return;

  const [commandName, ...args] = withoutPrefix.split(/\s+/);
  if (!commandName) return;

  const command = message.client.commands.get(commandName.toLowerCase());
  if (!command?.executeMessage) {
    return;
  }

  void upsertUser(message.author.id).catch((err) => logger.error(err));

  try {
    await command.executeMessage(message, args);
  } catch (err) {
    logger.error(err);
    await safeReply(message, 'Произошла ошибка при выполнении команды.');
  }
}