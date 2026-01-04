import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildRegistrationEntryView } from '../features/registration/registrationEntryView.js';
import { getUserRegistration } from '../../services/countryRegistrationService.js';
import { logger } from '../../shared/logger.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';

export const reg: Command = {
  data: new SlashCommandBuilder().setName('reg').setDescription('Автоматическая регистрация государства'),

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    try {
      const view = await buildRegistrationEntryView({ guild: interaction.guild });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });

      const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
      if (existingRegistration) {
        await interaction.followUp({
          components: buildWarningView(formatEmoji, `Вы уже зарегистрированы за **${existingRegistration.countryName}**.`),
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось открыть меню регистрации. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message) {
    if (!message.inGuild() || !message.guild) return;
    if (!message.channel.isSendable()) return;
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    try {
      const view = await buildRegistrationEntryView({ guild: message.guild });
      await message.channel.send({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Не удалось открыть меню регистрации. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};