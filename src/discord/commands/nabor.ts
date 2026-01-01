import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildNaborView } from '../features/applications/view.js';
import { logger } from '../../shared/logger.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';

export const nabor: Command = {
  data: new SlashCommandBuilder().setName('nabor').setDescription('Показать открытые вакансии'),

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    try {
      if (!interaction.inCachedGuild()) {
        await interaction.reply({
          components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
        return;
      }

      const view = buildNaborView(interaction.guildId);

      await interaction.reply({
        components: view.components,
        files: view.files,
        flags: view.flags
      });
    } catch (error) {
      logger.error(error);

      const payload = {
        components: buildWarningView(formatEmoji, 'Произошла ошибка при выполнении команды.'),
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    try {
      if (!message.inGuild()) {
        if (!message.channel?.isSendable()) return;
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
          flags: MessageFlags.IsComponentsV2
        });
        return;
      }

      const view = buildNaborView(message.guildId);

      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: view.components,
        files: view.files,
        flags: view.flags
      });
    } catch (error) {
      logger.error(error);

      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Произошла ошибка при выполнении команды.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};