import {
  AttachmentBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type ButtonComponentData,
  type APISelectMenuOption,
  type ContainerComponentData,
  type StringSelectMenuComponentData,
  type TopLevelComponentData
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
    '*・Возраст 16+ лет ( Возможны исключения )*',
    '*・Адекватность и стрессоустойчивость*',
    '*・Знание и понимание правил сервера*',
    '*・- Готовность работать в команде*'
  ].join('\n');

  const rulesButton: ButtonComponentData = {
    type: ComponentType.Button,
    style: ButtonStyle.Link,
    label: 'Правила сервера',
    url: buildRulesUrl(guildId)
  };

  const selectMenuOptions: APISelectMenuOption[] = vacancies.map((vacancy) => ({
    label: vacancy.label,
    value: vacancy.key
  }));

  const selectMenu: StringSelectMenuComponentData = {
    type: ComponentType.StringSelect,
    customId: buildCustomId('application', 'select'),
    placeholder: 'Выберите вакансию',
    minValues: 1,
    maxValues: 1,
    options: selectMenuOptions
  };

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
      rulesButton,
      MESSAGE_SEPARATOR_COMPONENT,
      selectMenu
    ]
  };

  return {
    components: [framed],
    files: [banner],
    flags: MessageFlags.IsComponentsV2
  };
}