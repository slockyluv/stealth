import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import type { Command } from '../../types/command.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: '🏓 Pong!',
      flags: MessageFlags.Ephemeral
    });
  }
};