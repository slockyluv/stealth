import {
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ContainerComponentData,
  type Guild,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';

export async function buildRegistrationEntryView(options: {
  guild: Guild;
}): Promise<{ components: TopLevelComponentData[] }> {
  const { guild } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('registration', 'type'))
      .setPlaceholder('Выберите тип регистрации')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Государство')
          .setValue('state')
          .setEmoji(formatEmoji('worldpulse')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Частная компания')
          .setValue('company')
          .setEmoji(formatEmoji('filialscomp'))
      )
  );

  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('worldpulse')} Регистрация**`
    },
    {
      type: ComponentType.TextDisplay,
      content: '*Выберите тип регистрации в меню ниже.*'
    },
    menuRow.toJSON()
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