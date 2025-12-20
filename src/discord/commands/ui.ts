import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type ContainerComponentData,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildCustomId } from '../../shared/customId.js';

export const ui: Command = {
  data: new SlashCommandBuilder()
    .setName('ui')
    .setDescription('UI demo: button routing example'),

  async execute(interaction: ChatInputCommandInteraction) {
    const id = buildCustomId('demo', 'hello');

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel('Say hello')
        .setStyle(ButtonStyle.Primary)
    );

    const framedMessage: ContainerComponentData = {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: '**UI demo**\nНажми кнопку ниже, чтобы проверить роутинг интерфейса.'
        },
        buttonRow.toJSON()
      ]
    };

    await interaction.reply({
      components: [framedMessage],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    });
  },

  async executeMessage(message: Message) {
    const id = buildCustomId('demo', 'hello');

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel('Say hello')
        .setStyle(ButtonStyle.Primary)
    );

    const framedMessage: ContainerComponentData = {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: '**UI demo**\nНажми кнопку ниже, чтобы проверить роутинг интерфейса.'
        },
        buttonRow.toJSON()
      ]
    };

    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: [framedMessage],
      flags: MessageFlags.IsComponentsV2
    });
  }
};