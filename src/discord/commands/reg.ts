import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction, type Message } from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildRegistrationView } from '../features/registration/registrationView.js';
import { getUserRegistration } from '../../services/countryRegistrationService.js';
import { logger } from '../../shared/logger.js';

export const reg: Command = {
  data: new SlashCommandBuilder().setName('reg').setDescription('Автоматическая регистрация государства'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: 'Команда доступна только внутри сервера.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    try {
      const view = await buildRegistrationView({ guild: interaction.guild });
      await interaction.editReply({ components: view.components, flags: MessageFlags.IsComponentsV2 });

      const existingRegistration = await getUserRegistration(interaction.guildId, interaction.user.id);
      if (existingRegistration) {
        await interaction.followUp({
          content: `Вы уже зарегистрированы за **${existingRegistration.countryName}**.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        content: 'Не удалось открыть меню регистрации. Попробуйте позже.',
        components: []
      });
    }
  },

  async executeMessage(message: Message) {
    if (!message.inGuild() || !message.guild) return;
    if (!message.channel.isSendable()) return;

    try {
      const view = await buildRegistrationView({ guild: message.guild });
      await message.channel.send({ components: view.components, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
    }
  }
};