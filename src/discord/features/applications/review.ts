import {
  ActionRowBuilder,
  ComponentType,
  StringSelectMenuBuilder,
  type APISelectMenuOption,
  type ContainerComponentData,
  type TopLevelComponentData
} from 'discord.js';
import {
  APPROVE_EMOJI_NAME,
  MESSAGE_SEPARATOR_COMPONENT,
  REJECT_EMOJI_NAME,
  type VacancyConfig
} from './config.js';

export type ApplicationPayload = {
  vacancy: VacancyConfig;
  applicantId: string;
  answers: {
    name: string;
    age: string;
    experience: string;
    timezone: string;
  };
};

type ReviewDisplayOptions = {
  payload: ApplicationPayload;
  status: 'На рассмотрении' | 'Одобрено' | 'Отклонено';
  reviewerMention: string;
  reviewerDisplay?: string;
  reason?: string;
  includeActions?: boolean;
  actionCustomId?: string;
};

function text(content: string) {
  return { type: ComponentType.TextDisplay as const, content };
}

export function buildReviewDisplay(options: ReviewDisplayOptions): { components: TopLevelComponentData[] } {
  const { payload, status, reviewerMention, reviewerDisplay, reason, includeActions, actionCustomId } = options;

  const framed: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      text('# Новая заявка'),
      text(`**Вакансия:** \`${payload.vacancy.label}\``),
      text(`**Автор:** <@${payload.applicantId}>`),
      text(`**Статус:** \`${status}\``),
      text(`**Рассматривающий:** ${reviewerDisplay ? `<@${reviewerDisplay}>` : reviewerMention}`),
      text(`**Причина:** ${reason ? `\`${reason}\`` : '`—`'}`),
      MESSAGE_SEPARATOR_COMPONENT,
      text('# Анкета:'),
      text('**Ваше имя:**'),
      text(`> ${payload.answers.name}`),
      text('**Ваш возраст:**'),
      text(`> ${payload.answers.age}`),
      text('**Ваш опыт:**'),
      text(`> ${payload.answers.experience}`),
      text('**Часовой пояс:**'),
      text(`> ${payload.answers.timezone}`),
      MESSAGE_SEPARATOR_COMPONENT
    ]
  };

  if (includeActions && actionCustomId && framed.components) {
    const selectMenuOptions: APISelectMenuOption[] = [
      { label: 'Одобрить', value: 'approve' },
      { label: 'Отклонить', value: 'reject' }
    ];

    const selectMenuRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(actionCustomId)
        .setPlaceholder('Выберите действие')
        .setMinValues(1)
        .setMaxValues(1)
        .setOptions(selectMenuOptions)
    );

    framed.components = [...framed.components, selectMenuRow.toJSON()];
  }

  return { components: [framed] };
}

export function extractAnswersFromComponents(components: TopLevelComponentData[]): ApplicationPayload['answers'] {
  const container = components.find((comp) => (comp as ContainerComponentData).type === ComponentType.Container) as
    | ContainerComponentData
    | undefined;

  const textBlocks = container?.components?.filter(
    (child) => (child as any).type === ComponentType.TextDisplay && typeof (child as any).content === 'string'
  ) as { content: string }[] | undefined;

  const values = textBlocks?.map((block) => block.content) ?? [];

  const pick = (label: string) => {
    const index = values.findIndex((value) => value.trim() === label.trim());
    return index >= 0 ? values[index + 1]?.replace(/^>\s?/, '') ?? '—' : '—';
  };

  return {
    name: pick('**Ваше имя:**'),
    age: pick('**Ваш возраст:**'),
    experience: pick('**Ваш опыт:**'),
    timezone: pick('**Часовой пояс:**')
  };
}