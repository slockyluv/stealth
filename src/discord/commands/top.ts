import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { buildTopView } from '../features/topView.js';
import { logger } from '../../shared/logger.js';

export const top: Command = {
  data: new SlashCommandBuilder().setName('top').setDescription('Топ пользователей по активности'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      const formatEmoji = await createEmojiFormatter({
        client: interaction.client,
        guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
        guildEmojis: interaction.guild?.emojis.cache.values()
      });

      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    try {
      const view = await buildTopView({
        guild: interaction.guild,
        section: 'levels',
        page: 1
      });

      await interaction.editReply({
        components: view,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] }
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось загрузить список лидеров.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
  async executeMessage(message: Message) {
    if (!message.guild || !message.channel?.isSendable()) {
      return;
    }

    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    try {
      const view = await buildTopView({
        guild: message.guild,
        section: 'levels',
        page: 1
      });

      await message.channel.send({
        components: view,
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { users: [] }
      });
    } catch (error) {
      logger.error(error);
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Не удалось загрузить список лидеров.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};