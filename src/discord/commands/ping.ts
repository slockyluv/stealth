import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  type Message
} from 'discord.js';
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
  },

  async executeMessage(message: Message) {
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ content: '🏓 Pong!' });
  }
};
