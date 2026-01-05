import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type ContainerComponentData,
  type Message
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { buildCustomId } from '../../shared/customId.js';
import { createEmojiFormatter } from '../emoji.js';
import { ALLOW_OWNERPANEL, enforceInteractionAllow, enforceMessageAllow } from './allow.js';

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

    const container = buildOwnerpanelContainer(formatEmoji);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
    });
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!(await enforceMessageAllow(message, ALLOW_OWNERPANEL, { formatEmoji }))) return;

    const container = buildOwnerpanelContainer(formatEmoji);

    if (!message.channel?.isSendable()) return;

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};

function buildOwnerpanelContainer(formatEmoji: (name: string) => string): ContainerComponentData {
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

  return {
    type: ComponentType.Container,
    components: [row.toJSON()]
  };
}