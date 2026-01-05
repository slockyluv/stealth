import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type ContainerComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import { ALLOW_OWNERPANEL, enforceInteractionAllow } from './allow.js';

const OWNERPANEL_SCOPE = 'ownerpanel';

export const ownerpanel: Command = {
  data: new SlashCommandBuilder()
    .setName('ownerpanel')
    .setDescription('Панель управления владельца сервера'),

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!(await enforceInteractionAllow(interaction, ALLOW_OWNERPANEL, { formatEmoji }))) return;

    const basketEmoji = formatEmoji('basket');
    const resetCountriesId = buildCustomId(OWNERPANEL_SCOPE, 'resetCountries');
    const resetCompaniesId = buildCustomId(OWNERPANEL_SCOPE, 'resetCompanies');

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(resetCountriesId)
        .setLabel('Зарегистрированные страны')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(basketEmoji),
      new ButtonBuilder()
        .setCustomId(resetCompaniesId)
        .setLabel('Частные компании')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(basketEmoji)
    );

    const container: ContainerComponentData = {
      type: ComponentType.Container,
      components: [row.toJSON()]
    };

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  }
};