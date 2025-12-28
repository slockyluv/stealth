import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildNaborView } from '../features/applications/view.js';
import { logger } from '../../shared/logger.js';

function display(lines: string[]) {
  return [
    { type: ComponentType.Container, components: lines.map((content) => ({ type: ComponentType.TextDisplay, content })) }
  ];
}

export const nabor: Command = {
  data: new SlashCommandBuilder().setName('nabor').setDescription('Показать открытые вакансии'),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      if (!interaction.inCachedGuild()) {
        await interaction.reply({
          components: display(['Команда доступна только на сервере.']),
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
        components: display(['Произошла ошибка при выполнении команды.']),
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
    try {
      if (!message.inGuild()) {
        if (!message.channel?.isSendable()) return;
        await message.channel.send({
          components: display(['Команда доступна только на сервере.']),
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
        components: display(['Произошла ошибка при выполнении команды.']),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};