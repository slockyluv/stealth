import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Message,
  MessageFlags
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildMutesView } from '../features/mutesView.js';
import { buildTextView } from '../components/v2Message.js';
import { logger } from '../../shared/logger.js';
import { ALLOW_MUTES, enforceInteractionAllow, enforceMessageAllow } from './allow.js';

const mutesCommand = new SlashCommandBuilder()
  .setName('mutes')
  .setDescription('Список активных мьютов') as SlashCommandBuilder;

function parsePageArg(arg?: string): number {
  if (!arg) return 1;
  const page = Number.parseInt(arg, 10);
  if (!Number.isFinite(page) || page <= 0) return 1;
  return page;
}

export const mutes: Command = {
  data: mutesCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_MUTES))) return;

    await interaction.deferReply();

    try {
      const view = await buildMutesView({ guild: interaction.guild, page: 1 });
      await interaction.editReply({ components: view, flags: MessageFlags.IsComponentsV2 });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildTextView('Не удалось получить список мьютов.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_MUTES))) return;

    const page = parsePageArg(args[0]);

    try {
      const view = await buildMutesView({ guild: message.guild, page });
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: view,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось получить список мьютов.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};