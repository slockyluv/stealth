import {
  ButtonStyle,
  ComponentType,
  type ButtonComponentData,
  type ComponentInContainerData,
  type ContainerComponentData,
  type TextDisplayComponentData,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { MESSAGE_SEPARATOR_COMPONENT } from './applications/config.js';

export const MARRY_SCOPE = 'marry';
export const MARRY_ACCEPT_ACTION = 'accept';
export const MARRY_REJECT_ACTION = 'reject';
export const MARRY_DIVORCE_ACTION = 'divorce';

const spacer = '\u200b';

function buildSeparator() {
  return MESSAGE_SEPARATOR_COMPONENT;
}

function buildTextLine(content: string): TextDisplayComponentData {
  return {
    type: ComponentType.TextDisplay,
    content
  };
}

function buildContainer(components: ComponentInContainerData[]): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

export function buildMarryProposalView(options: {
  authorMention: string;
  targetMention: string;
  proposerId: string;
  targetId: string;
  acceptEmoji?: string;
  rejectEmoji?: string;
}): TopLevelComponentData[] {
  const { authorMention, targetMention, proposerId, targetId, acceptEmoji, rejectEmoji } = options;

  const acceptButton: ButtonComponentData = {
    type: ComponentType.Button,
    customId: buildCustomId(MARRY_SCOPE, MARRY_ACCEPT_ACTION, proposerId, targetId),
    label: 'Принять',
    ...(acceptEmoji ? { emoji: acceptEmoji } : {}),
    style: ButtonStyle.Secondary
  };

  const rejectButton: ButtonComponentData = {
    type: ComponentType.Button,
    customId: buildCustomId(MARRY_SCOPE, MARRY_REJECT_ACTION, proposerId, targetId),
    label: 'Отклонить',
    ...(rejectEmoji ? { emoji: rejectEmoji } : {}),
    style: ButtonStyle.Secondary
  };

  return buildContainer([
    buildTextLine('**💍 Предложение союза**'),
    buildSeparator(),
    buildTextLine('*Иногда одного решения достаточно,*'),
    buildTextLine('*чтобы изменить направление пути.*'),
    buildTextLine(spacer),
    buildTextLine(`*${authorMention} делает шаг навстречу*`),
    buildTextLine(`*и предлагает союз пользователю ${targetMention}.*`),
    buildSeparator(),
    { type: ComponentType.ActionRow, components: [acceptButton, rejectButton] }
  ]);
}

export function buildMarryUnionView(options: {
  user1: string;
  user2: string;
  date: string;
  daysTogether: number;
  user1Id: string;
  user2Id: string;
}): TopLevelComponentData[] {
  const { user1, user2, date, daysTogether, user1Id, user2Id } = options;

  const divorceButton: ButtonComponentData = {
    type: ComponentType.Button,
    customId: buildCustomId(MARRY_SCOPE, MARRY_DIVORCE_ACTION, user1Id, user2Id),
    label: 'Развестись',
    emoji: { name: '💔' },
    style: ButtonStyle.Secondary
  };

  return buildContainer([
    buildTextLine('**💍 Брачный союз**'),
    buildSeparator(),
    buildTextLine('*История, начавшаяся с одного шага.*'),
    buildTextLine(spacer),
    buildTextLine('**Партнёры:**'),
    buildTextLine(`*${user1} ✦ ${user2}*`),
    buildTextLine(`**Дата союза:** \`${date}\``),
    buildTextLine(`**Дней вместе:** \`${daysTogether}\``),
    buildTextLine(spacer),
    buildTextLine('*Каждый день — ещё одна страница*'),
    buildTextLine('*вашей общей истории.*'),
    buildSeparator(),
    { type: ComponentType.ActionRow, components: [divorceButton] }
  ]);
}

export function buildMarrySingleView(): TopLevelComponentData[] {
  return buildContainer([
    buildTextLine('**💍 Вы холост**'),
    buildSeparator(),
    buildTextLine('*Твой путь пока свободен.*'),
    buildTextLine(spacer),
    buildTextLine('**Для заключения брачного союза используйте:**'),
    buildTextLine('*> !marry @Пользователь*')
  ]);
}

export function buildMarryDivorcedView(options: { user1: string; user2: string }): TopLevelComponentData[] {
  const { user1, user2 } = options;

  return buildContainer([
    buildTextLine('**💔 Союз расторгнут**'),
    buildSeparator(),
    buildTextLine('*Каждая история имеет своё время.*'),
    buildTextLine(spacer),
    buildTextLine(`*${user1} и ${user2} больше не связаны союзом,*`),
    buildTextLine('*но каждый продолжает путь дальше*'),
    buildTextLine('*своим направлением.*')
  ]);
}

export function buildMarryAcceptedView(options: {
  user1: string;
  user2: string;
}): TopLevelComponentData[] {
  const { user1, user2 } = options;

  return buildContainer([
    buildTextLine('**💍 Предложение союза**'),
    buildSeparator(),
    buildTextLine('*✨ Иногда достаточно одного шага, чтобы пути сошлись…*'),
    buildTextLine(spacer),
    buildTextLine(`*${user1} и ${user2} сделали выбор идти дальше вместе.*`),
    buildTextLine('*С этого момента ваши истории переплелись, а каждый новый день —*'),
    buildTextLine('*ещё одна страница общей дороги.*'),
    buildTextLine(spacer),
    buildTextLine('**💫 Теперь вы партнёры.**'),
    buildTextLine('*Информация о союзе сохранена и отображается в профиле.*')
  ]);
}

export function buildMarryRejectedView(username: string): TopLevelComponentData[] {
  return buildContainer([
    buildTextLine('**💔 Предложение отклонено**'),
    buildSeparator(),
    buildTextLine(`*${username} решил(а) не связывать пути.*`),
    buildTextLine(spacer),
    buildTextLine('*Иногда история заканчивается раньше,*'),
    buildTextLine('*чтобы началась новая.*')
  ]);
}

export function buildMarryExpiredView(): TopLevelComponentData[] {
  return buildContainer([
    buildTextLine('**⏳ Предложение истекло**'),
    buildSeparator(),
    buildTextLine('*Ответ так и не был получен.*'),
    buildTextLine(spacer),
    buildTextLine('*Возможно, судьба решила иначе.*')
  ]);
}

export function buildMarrySelfErrorView(): TopLevelComponentData[] {
  return buildContainer([buildTextLine('**Даже самый крепкий союз требует двоих.**')]);
}

export function buildMarryAlreadyExistsView(): TopLevelComponentData[] {
  return buildContainer([
    buildTextLine('**💍 Союз уже существует**'),
    buildSeparator(),
    buildTextLine('*Ты уже связан(а) союзом.*')
  ]);
}

export function buildMarryTargetTakenView(): TopLevelComponentData[] {
  return buildContainer([
    buildTextLine('**💍 Сердце занято**'),
    buildSeparator(),
    buildTextLine('*Этот пользователь уже состоит в союзе.*')
  ]);
}

export function buildMarryNotForYouView(): TopLevelComponentData[] {
  return buildContainer([buildTextLine('**Это предложение предназначено другому пользователю.**')]);
}