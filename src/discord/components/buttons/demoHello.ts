import type { ButtonHandler } from '../../../types/component.js';
import { MessageFlags } from 'discord.js';

export const demoHelloButton: ButtonHandler = {
  key: 'demo:hello',

  async execute(interaction, ctx) {
    // ctx.customId.args — аргументы, если будут (demo:hello:arg1:arg2)
    await interaction.reply({
      content: 'Привет! UI-router работает.',
      flags: MessageFlags.Ephemeral
    });
  }
};