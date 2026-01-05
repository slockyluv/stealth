import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ContainerComponentData,
  type Guild,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';

export async function buildPrivateCompanyEntryView(options: {
  guild: Guild;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'entryNew'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Новая компания')
      .setEmoji(formatEmoji('documentgavel')),
    new ButtonBuilder()
      .setCustomId(buildCustomId('companyReg', 'entryExisting'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Существующая компания')
      .setEmoji(formatEmoji('filialscomp'))
  );

  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('filialscomp')} Регистрация частной компании**`
    },
    {
      type: ComponentType.TextDisplay,
      content: '*Выберите тип регистрации компании.*'
    },
    actionsRow.toJSON()
  ];

  return {
    components: [
      {
        type: ComponentType.Container,
        components: containerComponents
      }
    ]
  };
}