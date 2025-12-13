import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildCustomId } from '../../shared/customId.js';

export const ui: Command = {
  data: new SlashCommandBuilder()
    .setName('ui')
    .setDescription('UI demo: button routing example'),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = buildCustomId('demo', 'hello');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel('Say hello')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: 'UI demo: нажми кнопку ниже.',
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }
};