import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
  type GuildTextBasedChannel,
  type Message,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { ALLOW_CLEAR, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { buildTextContainer, buildUsageView, buildWarningView } from '../responses/messageBuilders.js';
import { logger } from '../../shared/logger.js';

const CLEAR_USAGE = '!clear <Кол-во сообщений ( от 1 до 1000 )>';

function resolveDeleteCount(input: string | null | undefined): number | null {
  if (!input) return null;
  const value = Number.parseInt(input, 10);
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > 1000) return null;
  return value;
}

function hasManageMessages(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages) ?? false;
}

function hasManageMessagesMessage(message: Message): boolean {
  return message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages) ?? false;
}

function buildClearSuccessView(formatEmoji: (name: string) => string, deletedCount: number): TopLevelComponentData[] {
  return buildTextContainer(`**${formatEmoji('basket')} Успешно удалено ${deletedCount} сообщений.**`);
}

async function bulkDeleteMessages(channel: GuildTextBasedChannel, count: number): Promise<number> {
  let remaining = count;
  let deleted = 0;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, 100);
    const deletedBatch = await channel.bulkDelete(batchSize, true);
    deleted += deletedBatch.size;
    remaining -= batchSize;
    if (deletedBatch.size < batchSize) break;
  }

  return deleted;
}

const clearCommand = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Очистка сообщений в чате')
  .addIntegerOption((option) =>
    option
      .setName('count')
      .setDescription('Кол-во сообщений для удаления (1-1000)')
      .setMinValue(1)
      .setMaxValue(1000)
      .setRequired(true)
  ) as SlashCommandBuilder;

export const clear: Command = {
  data: clearCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!(await enforceInteractionAllow(interaction, ALLOW_CLEAR, { formatEmoji }))) return;

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!hasManageMessages(interaction)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'У вас нет прав для использования этой команды.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel?.isTextBased() || !('bulkDelete' in channel)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось удалить сообщения в этом канале.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const count = interaction.options.getInteger('count', true);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: false });
    }

    try {
      const deletedCount = await bulkDeleteMessages(channel as GuildTextBasedChannel, count);
      await interaction.editReply({
        components: buildClearSuccessView(formatEmoji, deletedCount),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось удалить сообщения.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!(await enforceMessageAllow(message, ALLOW_CLEAR, { formatEmoji }))) return;

    if (!message.inGuild()) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    if (!hasManageMessagesMessage(message)) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'У вас нет прав для использования этой команды.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const amount = resolveDeleteCount(args[0]);
    if (!amount) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildUsageView(formatEmoji, CLEAR_USAGE),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    const channel = message.channel;
    if (!channel?.isTextBased() || !('bulkDelete' in channel)) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось удалить сообщения в этом канале.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    try {
      const deletedCount = await bulkDeleteMessages(channel as GuildTextBasedChannel, amount);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildClearSuccessView(formatEmoji, deletedCount),
          flags: MessageFlags.IsComponentsV2
        });
      }
    } catch (error) {
      logger.error(error);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось удалить сообщения.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};