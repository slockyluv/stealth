import { channelMention, roleMention, userMention, type Guild, type User } from 'discord.js';
import { createEmojiFormatter } from '../emoji.js';
import { sendActionLog, buildBaseContainer } from './actionLogSender.js';
import { formatDateTime, formatDuration, formatRelative } from '../../shared/time.js';

function formatMention(id: string | null | undefined, italic = false): string {
  if (!id) return italic ? '*неизвестно*' : 'неизвестно';
  const mention = userMention(id);
  return italic ? `*${mention}*` : mention;
}

function formatReason(reason: string | null | undefined): string {
  if (!reason) return '*не указана*';
  return `*${reason}*`;
}

function formatContentBlock(label: string, content: string): string {
  const safeContent = content || '*пустое сообщение*';
  return [`**${label}:**`, safeContent].join('\n');
}

async function buildHeader(guild: Guild, emojiName: string, title: string) {
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  return `**${formatEmoji(emojiName)} ${title}**`;
}

export async function logBan(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  reason?: string | null;
  createdAt?: Date;
}) {
  const { guild, user, moderatorId, reason, createdAt } = options;

  const header = await buildHeader(guild, 'userforbiddenalt', 'Блокировка пользователя');
  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Причина:** ${formatReason(reason)}`,
    `**Дата и время:** \`${formatDateTime(createdAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logUnban(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  banReason?: string | null;
  bannedAt?: Date | null;
  unbannedAt?: Date;
}) {
  const { guild, user, moderatorId, banReason, bannedAt, unbannedAt } = options;

  const header = await buildHeader(guild, 'usernew', 'Разблокировка пользователя');
  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Причина блокировки:** ${formatReason(banReason)}`,
    `**Дата и время блокировки:** ${bannedAt ? `\`${formatDateTime(bannedAt)}\`` : '*неизвестно*'}`,
    `**Дата и время разблокировки:** \`${formatDateTime(unbannedAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logKick(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  reason?: string | null;
  createdAt?: Date;
}) {
  const { guild, user, moderatorId, reason, createdAt } = options;
  const header = await buildHeader(guild, 'userforbiddenalt', 'Кик пользователя');

  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Причина:** ${formatReason(reason)}`,
    `**Дата и время:** \`${formatDateTime(createdAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logMute(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  reason?: string | null;
  durationMs: number;
  expiresAt: Date;
  createdAt?: Date;
}) {
  const { guild, user, moderatorId, reason, durationMs, expiresAt, createdAt } = options;
  const header = await buildHeader(guild, 'action_mute', 'Выдача блокировки чата');

  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Причина:** ${formatReason(reason)}`,
    `**Длительность:** \`${formatDuration(durationMs)}\` ( \`${formatRelative(expiresAt)}\` )`,
    `**Дата и время:** \`${formatDateTime(createdAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logUnmute(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  reason?: string | null;
  durationMs?: number | null;
  expiresAt?: Date | null;
  mutedAt?: Date | null;
  removedAt?: Date;
}) {
  const { guild, user, moderatorId, reason, durationMs, expiresAt, mutedAt, removedAt } = options;
  const header = await buildHeader(guild, 'action_control', 'Снятие блокировки чата');

  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Причина мута:** ${formatReason(reason)}`,
    `**Длительность:** ${durationMs ? `\`${formatDuration(durationMs)}\` ( \`${expiresAt ? formatRelative(expiresAt) : 'исчезает'}\` )` : '*неизвестно*'}`,
    `**Дата и время выдачи мута:** ${mutedAt ? `\`${formatDateTime(mutedAt)}\`` : '*неизвестно*'}`,
    `**Дата и время снятия мута:** \`${formatDateTime(removedAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logNicknameChange(options: {
  guild: Guild;
  user: User;
  moderatorId: string | null;
  oldNickname: string | null;
  newNickname: string | null;
  changedAt?: Date;
}) {
  const { guild, user, moderatorId, oldNickname, newNickname, changedAt } = options;
  const header = await buildHeader(guild, 'edit', 'Изменение Nickname');

  const lines = [
    header,
    `**Пользователь:** ${formatMention(user.id, true)}`,
    `**Администратор:** ${formatMention(moderatorId, true)}`,
    `**Старый nickname:** *${oldNickname ?? 'нет'}*`,
    `**Новый nickname** *${newNickname ?? 'нет'}*`,
    `**Дата и время:** \`${formatDateTime(changedAt ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'moderation', components });
}

export async function logRoleGrant(options: {
  guild: Guild;
  roleId: string;
  userId: string;
  moderatorId: string | null;
  at?: Date;
  temporary?: boolean;
  durationLabel?: string;
  expiresAt?: Date;
}) {
  const { guild, roleId, userId, moderatorId, at, temporary, durationLabel, expiresAt } = options;
  const header = await buildHeader(guild, 'plus', temporary ? 'Выдача временной роли' : 'Выдача роли');

  const lines = [
    header,
    `**Роль:** ${roleMention(roleId)}`,
    `**Пользователь:** ${userMention(userId)}`,
    `**Администратор:** ${formatMention(moderatorId)}`
  ];

  if (temporary && durationLabel) {
    lines.push(`**Срок временной роли:** ${durationLabel}`);
  }

  lines.push(`**Дата и время:** \`${formatDateTime(at ?? new Date())}\``);

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'roles', components });
}

export async function logRoleRevoke(options: {
  guild: Guild;
  roleId: string;
  userId: string;
  moderatorId: string | null;
  at?: Date;
}) {
  const { guild, roleId, userId, moderatorId, at } = options;
  const header = await buildHeader(guild, 'minus', 'Снятие роли');

  const lines = [
    header,
    `**Роль:** ${roleMention(roleId)}`,
    `**Пользователь:** ${userMention(userId)}`,
    `**Администратор:** ${formatMention(moderatorId)}`,
    `**Дата и время:** \`${formatDateTime(at ?? new Date())}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'roles', components });
}

export async function logMessageEdit(options: {
  guild: Guild;
  authorId: string;
  channelId: string;
  before: string;
  editedAt: Date;
}) {
  const { guild, authorId, channelId, before, editedAt } = options;
  const header = await buildHeader(guild, 'edit', 'Изменение сообщения');

  const lines = [
    header,
    `**Автор:** ${userMention(authorId)}`,
    `**Чат:** ${channelMention(channelId)}`,
    formatContentBlock('До изменения', before),
    `**Дата и время изменения:** \`${formatDateTime(editedAt)}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'messages', components });
}

export async function logMessageDelete(options: {
  guild: Guild;
  authorId: string;
  channelId: string;
  content: string;
  deletedById: string | null;
  deletedAt: Date;
}) {
  const { guild, authorId, channelId, content, deletedById, deletedAt } = options;
  const header = await buildHeader(guild, 'basket', 'Удаление сообщения');

  const lines = [
    header,
    `**Автор:** ${userMention(authorId)}`,
    `**Чат:** ${channelMention(channelId)}`,
    formatContentBlock('Содержание', content),
    `**Удалено:** ${formatMention(deletedById ?? authorId)}`,
    `**Дата и время удаления:** \`${formatDateTime(deletedAt)}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'messages', components });
}

export async function logTrafficJoin(options: {
  guild: Guild;
  userId: string;
  inviterId: string | null;
  joinedAt: Date;
}) {
  const { guild, userId, inviterId, joinedAt } = options;
  const header = await buildHeader(guild, 'userlogin', 'Присоединение участника');

  const lines = [
    header,
    `**Пользователь:** ${userMention(userId)}`,
    `**Пригласил:** ${inviterId ? userMention(inviterId) : 'Пользовательская ссылка'}`,
    `**Дата и время присоединения:** \`${formatDateTime(joinedAt)}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'traffic', components });
}

export async function logTrafficLeave(options: {
  guild: Guild;
  userId: string;
  inviterId: string | null;
  joinedAt?: Date | null;
  leftAt: Date;
}) {
  const { guild, userId, inviterId, joinedAt, leftAt } = options;
  const header = await buildHeader(guild, 'userexit', 'Выход участника');

  const lines = [
    header,
    `**Пользователь:** ${userMention(userId)}`,
    `**Пригласил:** ${inviterId ? userMention(inviterId) : 'Пользовательская ссылка'}`,
    `**Дата и время присоединения:** ${joinedAt ? `\`${formatDateTime(joinedAt)}\`` : '*неизвестно*'}`,
    `**Дата и время выхода:** \`${formatDateTime(leftAt)}\``
  ];

  const components = buildBaseContainer(lines);
  await sendActionLog({ guild, category: 'traffic', components });
}