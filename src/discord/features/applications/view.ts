import {
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  type APISelectMenuOption,
  type ContainerComponentData,
  type TopLevelComponentData,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import {
  MESSAGE_SEPARATOR_COMPONENT,
  NABOR_BANNER_NAME,
  NABOR_BANNER_PATH,
  rulesChannelId,
  vacancies
} from './config.js';

export function buildRulesUrl(guildId: string): string {
  return `https://discord.com/channels/${guildId}/${rulesChannelId}`;
}

export function buildNaborView(guildId: string): {
  components: TopLevelComponentData[];
  files: AttachmentBuilder[];
  flags: number;
} {
  const banner = new AttachmentBuilder(NABOR_BANNER_PATH, {
    name: NABOR_BANNER_NAME,
    description: 'Список вакансий'
  });

  const vacanciesText = ['# Вакансии', ...vacancies.map((vacancy) => vacancy.mentionLine)].join('\n');

  const requirements = [
    '**Требования:**',
    '*・Возраст 15+ лет ( Возможны исключения )*',
    '*・Адекватность и стрессоустойчивость*',
    '*・Знание и понимание правил сервера*',
    '*・- Готовность работать в команде*'
  ].join('\n');

  const rulesButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel('Правила сервера')
      .setURL(buildRulesUrl(guildId))
  );

  const selectMenuOptions: APISelectMenuOption[] = vacancies.map((vacancy) => ({
    label: vacancy.label,
    value: vacancy.key
  }));

  const selectMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(buildCustomId('application', 'select'))
      .setPlaceholder('Выберите вакансию')
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions(selectMenuOptions)
  );

  const framed: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.MediaGallery,
        items: [{ media: { url: `attachment://${NABOR_BANNER_NAME}` } }]
      },
      MESSAGE_SEPARATOR_COMPONENT,
      { type: ComponentType.TextDisplay, content: vacanciesText },
      MESSAGE_SEPARATOR_COMPONENT,
      { type: ComponentType.TextDisplay, content: requirements },
      MESSAGE_SEPARATOR_COMPONENT,
      { type: ComponentType.TextDisplay, content: '```Перед подачей заявки ознакомьтесь с правилами сервера.```' },
      rulesButtonRow.toJSON(),
      MESSAGE_SEPARATOR_COMPONENT,
      selectMenuRow.toJSON()
    ]
  };

  return {
    components: [framed],
    files: [banner],
    flags: MessageFlags.IsComponentsV2
  };
}