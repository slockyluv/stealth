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
import { MESSAGE_SEPARATOR_COMPONENT } from '../applications/config.js';

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
          .setEmoji(formatEmoji('filialscomp')),
        new StringSelectMenuOptionBuilder()
          .setLabel('Снять с регистрации')
          .setValue('unreg')
          .setEmoji(formatEmoji('staff_warn'))
      )
  );

  const containerComponents: ContainerComponentData['components'] = [
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('apps')} Регистрация**`
    },
    MESSAGE_SEPARATOR_COMPONENT,
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('worldpulse')} Государство:**`
    },
    {
      type: ComponentType.TextDisplay,
      content:
        '```Территория, имеющая определённые границы, население и систему органов власти, осуществляющих управление обществом на основе права.```'
    },
    MESSAGE_SEPARATOR_COMPONENT,
    {
      type: ComponentType.TextDisplay,
      content: `**${formatEmoji('filialscomp')} Частная компания:**`
    },
    {
      type: ComponentType.TextDisplay,
      content:
        '```Предприятие, принадлежащее частным лицам или негосударственным структурам и осуществляющее деятельность с целью извлечения прибыли. ```'
    },
    MESSAGE_SEPARATOR_COMPONENT,
    {
      type: ComponentType.TextDisplay,
      content: 'Выберите тип регистрации в меню ниже.'
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