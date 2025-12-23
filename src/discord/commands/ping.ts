import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  MessageFlags,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { ALLOW_PING, enforceInteractionAllow, enforceMessageAllow } from './allow.js';

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ping command'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await enforceInteractionAllow(interaction, ALLOW_PING))) return;

    await interaction.reply({
      content: '🏓 Pong!',
      flags: MessageFlags.Ephemeral
    });
  },

  async executeMessage(message: Message) {
    if (!(await enforceMessageAllow(message, ALLOW_PING))) return;
    
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ content: '🏓 Pong!' });
  }
};
