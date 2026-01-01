import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionsBitField,
  type Message,
  MessageFlags,
  ComponentType,
  type ContainerComponentData,
  type ComponentInContainerData,
  type SeparatorComponentData,
  type TextDisplayComponentData,
  type TopLevelComponentData,
  type GuildMember,
  type Role,
  type Guild,
  type TextBasedChannel
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { logger } from '../../shared/logger.js';
import { ALLOW_ADD_ROLE, ALLOW_TAKE_ROLE, ALLOW_TEMP_ROLE, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { addTempRole, setPendingActionModerator } from '../../services/actionLogState.js';
import { pluralize } from '../../shared/time.js';
import { buildUsageView, buildWarningView } from '../responses/messageBuilders.js';

const ROLE_PROMPT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 90 * 24 * 60 * 60 * 1000;
const SAFE_TIMEOUT_MS = 2_147_483_647;

type DurationUnit = 'second' | 'minute' | 'hour' | 'day' | 'month';

const DURATION_MULTIPLIERS: Record<DurationUnit, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000
};

const DURATION_ALIASES: Record<string, DurationUnit> = {
  s: 'second',
  c: 'second',
  'с': 'second',
  m: 'minute',
  'м': 'minute',
  'мин': 'minute',
  h: 'hour',
  'ч': 'hour',
  d: 'day',
  'д': 'day',
  'дн': 'day',
  'мес': 'month'
};

function formatDurationLabel(value: number, unit: DurationUnit): string {
  const forms: Record<DurationUnit, [string, string, string]> = {
    second: ['секунду', 'секунды', 'секунд'],
    minute: ['минуту', 'минуты', 'минут'],
    hour: ['час', 'часа', 'часов'],
    day: ['день', 'дня', 'дней'],
    month: ['месяц', 'месяца', 'месяцев']
  };

  const unitForms = forms[unit];
  return `${value} ${pluralize(value, ...unitForms)}`;
}

function buildSeparator(): SeparatorComponentData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

function buildTextLine(content: string): TextDisplayComponentData {
  return {
    type: ComponentType.TextDisplay,
    content
  };
}

function buildTextView(text: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(text)]
  };

  return [container];
}

function buildAddRoleHintView(formatEmoji: (name: string) => string): TopLevelComponentData[] {
  return buildUsageView(formatEmoji, '!add-role <@Пользователь> [Название роли]');
}

function buildTakeRoleHintView(formatEmoji: (name: string) => string): TopLevelComponentData[] {
  return buildUsageView(formatEmoji, '!take-role <@Пользователь> [Название роли]');
}

function buildTempRoleHintView(formatEmoji: (name: string) => string): TopLevelComponentData[] {
  return buildUsageView(formatEmoji, '!temp-role <@Пользователь> [Название роли] [Время]');
}

function parseDuration(input: string): { ms: number; label: string } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+)\s*([a-zA-Zа-яА-Я]+)$/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const unit = match[2]?.toLowerCase();
  if (!unit) return null;

  const unitKey = DURATION_ALIASES[unit];
  if (!unitKey) return null;

  const multiplier = DURATION_MULTIPLIERS[unitKey];

  const ms = value * multiplier;
  if (ms > MAX_TIMEOUT_MS) return null;

  const label = formatDurationLabel(value, unitKey);
  return { ms, label };
}

async function ensureGuildMember(options: { guildMembers: GuildMember['guild']['members']; userId: string }) {
  const { guildMembers, userId } = options;
  try {
    return await guildMembers.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

async function ensureRole(options: { guildRoles: Guild['roles']; roleId: string }) {
  const { guildRoles, roleId } = options;
  try {
    return await guildRoles.fetch(roleId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

function parseUserId(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<@!?(\d+)>$/);
  const fallback = match?.[1] ?? trimmed;
  return fallback || null;
}

function parseRoleId(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^<@&(\d+)>$/);
  return match?.[1] ?? null;
}

function canManageRole(member: GuildMember, role: Role): boolean {
  if (member.guild.ownerId === member.id) return true;
  return member.roles.highest.comparePositionTo(role) > 0;
}

async function findRoleCandidates(guild: Guild, query: string): Promise<Role[]> {
  const parsedId = parseRoleId(query);
  if (parsedId) {
    const role = await ensureRole({ guildRoles: guild.roles, roleId: parsedId });
    return role && role.id !== guild.id ? [role] : [];
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  await guild.roles.fetch();
  const roles: Role[] = [];

  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.id) continue;
    if (role.name.toLowerCase().includes(normalizedQuery)) {
      roles.push(role);
    }
  }

  return roles;
}

function buildRoleListView(options: { formatEmoji: (name: string) => string; roles: Role[] }): TopLevelComponentData[] {
  const { formatEmoji, roles } = options;
  const components: ComponentInContainerData[] = [];

  components.push(buildTextLine(`**${formatEmoji('list')} Список ролей**`));
  components.push(
    buildTextLine('*Найдено несколько ролей, подходящих под запрос. Выберите номер нужной роли или "отмена"!*')
  );
  components.push(buildSeparator());

  roles.forEach((role, index) => {
    components.push(buildTextLine(`${index + 1}. <@&${role.id}> ( ID: \`${role.id}\` )`));
  });

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

function buildCancelledView(formatEmoji: (name: string) => string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(`**${formatEmoji('action_basket')} Действие отменено!**`)]
  };

  return [container];
}

function buildRoleActionSuccessView(options: {
  formatEmoji: (name: string) => string;
  emojiName: string;
  roleId: string;
  userMention: string;
  moderatorMention: string;
  durationLabel?: string;
  temporary?: boolean;
}): TopLevelComponentData[] {
  const { formatEmoji, emojiName, roleId, userMention, moderatorMention, durationLabel, temporary } = options;
  const header = temporary
    ? `${formatEmoji('slide_d')} Временная роль <@&${roleId}> успешно выдана!`
    : `${formatEmoji('slide_d')} Роль <@&${roleId}> успешно ${emojiName === 'minus' ? 'снята' : 'выдана'}!`;;

  const components: ComponentInContainerData[] = [];
  components.push(buildTextLine(`**${header}**`));
  components.push(buildSeparator());
  components.push(buildTextLine(`**Пользователь:** *${userMention}*`));
  components.push(buildTextLine(`**Администратор:** *${moderatorMention}*`));

  if (temporary && durationLabel) {
    components.push(buildTextLine(`**Срок:** *${durationLabel}*`));
  }

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

async function promptForRoleSelection(options: {
  channel: TextBasedChannel | null;
  authorId: string;
  roles: Role[];
  formatEmoji: (name: string) => string;
  reply: (components: TopLevelComponentData[]) => Promise<void>;
}): Promise<Role | null> {
  const { channel, authorId, roles, formatEmoji, reply } = options;
  if (!channel || !('createMessageCollector' in channel) || typeof channel.createMessageCollector !== 'function') {
    await reply(buildWarningView(formatEmoji, 'Канал не позволяет принимать ввод.'));
    return null;
  }

  await reply(buildRoleListView({ formatEmoji, roles }));

  return await new Promise((resolve) => {
    const collector = channel.createMessageCollector({
      filter: (msg) => msg.author.id === authorId,
      max: 1,
      time: ROLE_PROMPT_TIMEOUT_MS
    });

    collector.on('collect', (msg) => {
      const content = msg.content.trim().toLowerCase();
      if (content === 'отмена') {
        void reply(buildCancelledView(formatEmoji));
        resolve(null);
        return;
      }

      const parsedNumber = Number(content);
      if (!Number.isInteger(parsedNumber) || parsedNumber <= 0 || parsedNumber > roles.length) {
        void reply(buildCancelledView(formatEmoji));
        resolve(null);
        return;
      }

      const role = roles[parsedNumber - 1] ?? null;
      resolve(role);
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        void reply(buildCancelledView(formatEmoji));
        resolve(null);
      }
    });
  });
}

async function resolveRoleFromInput(options: {
  guild: Guild;
  query: string;
  authorId: string;
  channel: TextBasedChannel | null;
  formatEmoji: (name: string) => string;
  reply: (components: TopLevelComponentData[]) => Promise<void>;
}): Promise<Role | null> {
  const { guild, query, authorId, channel, formatEmoji, reply } = options;
  const candidates = await findRoleCandidates(guild, query);

  if (candidates.length === 0) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Указанная роль не найдена!**`));
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0]!;
  }

  return await promptForRoleSelection({ channel, authorId, roles: candidates, formatEmoji, reply });
}

function hasManageRoles(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

function hasManageRolesMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.ManageRoles) ?? false;
}

async function ensurePermissions(options: {
  moderator: GuildMember;
  target: GuildMember;
  role: Role;
  bot: GuildMember | null;
  reply: (components: TopLevelComponentData[]) => Promise<void>;
  action: 'add' | 'remove';
  formatEmoji: (name: string) => string;
}): Promise<boolean> {
  const { moderator, target, role, bot, reply, action, formatEmoji } = options;

  if (moderator.id === target.id) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Изменение ролей самому себе запрещено!**`));
    return false;
  }

  if (!canManageRole(moderator, role)) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Запрещено управлять ролью выше вашей!**`));
    return false;
  }

  if (!bot) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Бот не найден в списке участников!**`));
    return false;
  }

  if (!bot.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} У бота нет права «Управление ролями»!**`));
    return false;
  }

  if (bot.roles.highest.comparePositionTo(role) <= 0) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Указанная роль находится выше ролей бота!**`));
    return false;
  }

  if (!target.manageable) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} Бот не может изменить роли указанного пользователя!**`));
    return false;
  }

  if (action === 'add' && target.roles.cache.has(role.id)) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} У пользователя <@${target.id}> уже имеется роль <@&${role.id}>!**`));
    return false;
  }

  if (action === 'remove' && !target.roles.cache.has(role.id)) {
    await reply(buildTextView(`**${formatEmoji('staff_warn')} У пользователя <@${target.id}> отсутствует <@&${role.id}>!**`));
    return false;
  }

  return true;
}

async function performRoleChange(options: {
  target: GuildMember;
  role: Role;
  action: 'add' | 'remove';
  reason?: string;
  moderatorId: string;
}): Promise<boolean> {
  const { target, role, action, reason, moderatorId } = options;
  try {
    setPendingActionModerator({
      guildId: target.guild.id,
      targetId: target.id,
      action: action === 'add' ? 'role-add' : 'role-remove',
      extraId: role.id,
      moderatorId
    });
    if (action === 'add') {
      await target.roles.add(role, reason ?? undefined);
    } else {
      await target.roles.remove(role, reason ?? undefined);
    }
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

function scheduleRoleRemoval(options: {
  clientGuild: Guild;
  userId: string;
  roleId: string;
  durationMs: number;
}) {
  const { clientGuild, userId, roleId, durationMs } = options;
  let remaining = durationMs;

  const schedule = () => {
    const delay = Math.min(remaining, SAFE_TIMEOUT_MS);
    remaining -= delay;

    setTimeout(async () => {
      if (remaining > 0) {
        schedule();
        return;
      }

      try {
        const member = await ensureGuildMember({ guildMembers: clientGuild.members, userId });
        const role = await ensureRole({ guildRoles: clientGuild.roles, roleId });

        if (!member || !role) return;
        if (!member.roles.cache.has(role.id)) return;

        await member.roles.remove(role).catch((error) => logger.error(error));
      } catch (error) {
        logger.error(error);
      }
    }, delay);
  };

  schedule();
}

async function executeRoleInteraction(options: { interaction: ChatInputCommandInteraction; action: 'add' | 'remove' | 'temp' }) {
  const { interaction, action } = options;

  if (!interaction.inCachedGuild()) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
      flags: MessageFlags.IsComponentsV2
    });
    return;
  }

  const formatEmoji = await createEmojiFormatter({
    client: interaction.client,
    guildId: interaction.guild.id,
    guildEmojis: interaction.guild.emojis.cache.values()
  });

  const allowList = action === 'add' ? ALLOW_ADD_ROLE : action === 'remove' ? ALLOW_TAKE_ROLE : ALLOW_TEMP_ROLE;
  if (!(await enforceInteractionAllow(interaction, allowList))) return;

  if (!hasManageRoles(interaction)) {
    await interaction.reply({
      components: buildWarningView(formatEmoji, 'Требуется право **Управление ролями**.'),
      flags: MessageFlags.IsComponentsV2
    });
    return;
  }

  const targetUser = interaction.options.getUser('user');
  const roleQuery = interaction.options.getString('role');
  const durationRaw = interaction.options.getString('duration') ?? undefined;

  if (!targetUser || !roleQuery || (action === 'temp' && !durationRaw)) {
    const hint = action === 'add'
      ? buildAddRoleHintView(formatEmoji)
      : action === 'remove'
        ? buildTakeRoleHintView(formatEmoji)
        : buildTempRoleHintView(formatEmoji);
    await interaction.reply({ components: hint, flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const targetMember = await ensureGuildMember({ guildMembers: interaction.guild.members, userId: targetUser.id });
  const moderator = await ensureGuildMember({ guildMembers: interaction.guild.members, userId: interaction.user.id });

  if (!targetMember || !moderator) {
    await interaction.reply({ components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`), flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const role = await resolveRoleFromInput({
    guild: interaction.guild,
    query: roleQuery,
    authorId: interaction.user.id,
    channel: interaction.channel,
    formatEmoji,
    reply: async (components) => {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
      }
    }
  });

  if (!role) return;

  const botMember = interaction.guild.members.me ?? null;

  if (!(await ensurePermissions({
    moderator,
    target: targetMember,
    role,
    bot: botMember,
    reply: async (components) => {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
      }
    },
    action: action === 'remove' ? 'remove' : 'add',
    formatEmoji
  }))) {
    return;
  }

  if (action === 'temp') {
    const parsed = durationRaw ? parseDuration(durationRaw) : null;
  if (!parsed) {
      const components = buildTempRoleHintView(formatEmoji);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
      }
      return;
    }

    const success = await performRoleChange({
      target: targetMember,
      role,
      action: 'add',
      moderatorId: interaction.user.id
    });
    if (!success) {
      const components = buildWarningView(formatEmoji, 'Не удалось выдать роль. Проверьте права бота.');
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
      } else {
        await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
      }
      return;
    }

    addTempRole({
      guildId: interaction.guild.id,
      userId: targetMember.id,
      roleId: role.id,
      durationLabel: parsed.label,
      expiresAt: new Date(Date.now() + parsed.ms),
      moderatorId: interaction.user.id
    });

    scheduleRoleRemoval({ clientGuild: interaction.guild, userId: targetMember.id, roleId: role.id, durationMs: parsed.ms });

    const view = buildRoleActionSuccessView({
      formatEmoji,
      emojiName: 'plus',
      roleId: role.id,
      userMention: `<@${targetMember.id}>`,
      moderatorMention: `<@${interaction.user.id}>`,
      durationLabel: parsed.label,
      temporary: true
    });

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components: view, flags: MessageFlags.IsComponentsV2 });
    } else {
      await interaction.reply({ components: view, flags: MessageFlags.IsComponentsV2 });
    }

    return;
  }

  const success = await performRoleChange({
    target: targetMember,
    role,
    action: action === 'remove' ? 'remove' : 'add',
    moderatorId: interaction.user.id
  });
  if (!success) {
    const components = buildWarningView(formatEmoji, 'Не удалось изменить роль. Проверьте права бота.');
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ components, flags: MessageFlags.IsComponentsV2 });
    } else {
      await interaction.reply({ components, flags: MessageFlags.IsComponentsV2 });
    }
    return;
  }

  const view = buildRoleActionSuccessView({
    formatEmoji,
    emojiName: action === 'remove' ? 'minus' : 'plus',
    roleId: role.id,
    userMention: `<@${targetMember.id}>`,
    moderatorMention: `<@${interaction.user.id}>`
  });

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ components: view, flags: MessageFlags.IsComponentsV2 });
  } else {
    await interaction.reply({ components: view, flags: MessageFlags.IsComponentsV2 });
  }
}

async function executeRoleMessage(options: { message: Message; action: 'add' | 'remove' | 'temp'; args: string[] }) {
  const { message, action, args } = options;

  if (!message.guild) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global'
    });
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'), flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const allowList = action === 'add' ? ALLOW_ADD_ROLE : action === 'remove' ? ALLOW_TAKE_ROLE : ALLOW_TEMP_ROLE;
  if (!(await enforceMessageAllow(message, allowList))) return;

  const formatEmoji = await createEmojiFormatter({
    client: message.client,
    guildId: message.guild.id,
    guildEmojis: message.guild.emojis.cache.values()
  });

  if (!hasManageRolesMessage(message)) {
    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: buildWarningView(formatEmoji, 'Требуется право **Управление ролями**.'),
      flags: MessageFlags.IsComponentsV2
    });
    return;
  }

  const [targetIdRaw, roleQueryRaw, duration] = args;

  if (!targetIdRaw || !roleQueryRaw || (action === 'temp' && !duration)) {
    const hint = action === 'add'
      ? buildAddRoleHintView(formatEmoji)
      : action === 'remove'
        ? buildTakeRoleHintView(formatEmoji)
        : buildTempRoleHintView(formatEmoji);
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ components: hint, flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const targetId = parseUserId(targetIdRaw);
  if (!targetId) {
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ components: buildTextView(`**${formatEmoji('staff_warn')} Укажите корректного пользователя!**`), flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const targetMember = await ensureGuildMember({ guildMembers: message.guild.members, userId: targetId });
  const moderator = message.member;
  if (!targetMember || !moderator) {
    if (!message.channel?.isSendable()) return;
    await message.channel.send({ components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`), flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const role = await resolveRoleFromInput({
    guild: message.guild,
    query: roleQueryRaw,
    authorId: message.author.id,
    channel: message.channel,
    formatEmoji,
    reply: async (components) => {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({ components, flags: MessageFlags.IsComponentsV2 });
    }
  });

  if (!role) return;

  const botMember = message.guild.members.me ?? null;

  if (!(await ensurePermissions({
    moderator,
    target: targetMember,
    role,
    bot: botMember,
    reply: async (components) => {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({ components, flags: MessageFlags.IsComponentsV2 });
    },
    action: action === 'remove' ? 'remove' : 'add',
    formatEmoji
  }))) {
    return;
  }

  if (action === 'temp') {
    const parsed = duration ? parseDuration(duration) : null;
    if (!parsed) {
      const hint = buildTempRoleHintView(formatEmoji);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({ components: hint, flags: MessageFlags.IsComponentsV2 });
      return;
    }

    const success = await performRoleChange({
      target: targetMember,
      role,
      action: 'add',
      moderatorId: message.author.id
    });
    if (!success) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Не удалось выдать роль. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    addTempRole({
      guildId: message.guild.id,
      userId: targetMember.id,
      roleId: role.id,
      durationLabel: parsed.label,
      expiresAt: new Date(Date.now() + parsed.ms),
      moderatorId: message.author.id
    });

    scheduleRoleRemoval({ clientGuild: message.guild, userId: targetMember.id, roleId: role.id, durationMs: parsed.ms });

    const view = buildRoleActionSuccessView({
      formatEmoji,
      emojiName: 'plus',
      roleId: role.id,
      userMention: `<@${targetMember.id}>`,
      moderatorMention: `<@${message.author.id}>`,
      durationLabel: parsed.label,
      temporary: true
    });

    if (!message.channel?.isSendable()) return;
    await message.channel.send({ components: view, flags: MessageFlags.IsComponentsV2 });
    return;
  }

  const success = await performRoleChange({
    target: targetMember,
    role,
    action: action === 'remove' ? 'remove' : 'add',
    moderatorId: message.author.id
  });
  if (!success) {
    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: buildWarningView(formatEmoji, 'Не удалось изменить роль. Проверьте права бота.'),
      flags: MessageFlags.IsComponentsV2
    });
    return;
  }

  const view = buildRoleActionSuccessView({
    formatEmoji,
    emojiName: action === 'remove' ? 'minus' : 'plus',
    roleId: role.id,
    userMention: `<@${targetMember.id}>`,
    moderatorMention: `<@${message.author.id}>`
  });

  if (!message.channel?.isSendable()) return;
  await message.channel.send({ components: view, flags: MessageFlags.IsComponentsV2 });
}

const addRoleCommand = new SlashCommandBuilder()
  .setName('add-role')
  .setDescription('Выдача роли пользователю')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
  .addStringOption((option) => option.setName('role').setDescription('Роль для выдачи').setRequired(true)) as SlashCommandBuilder;

const takeRoleCommand = new SlashCommandBuilder()
  .setName('take-role')
  .setDescription('Снятие роли с пользователя')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
  .addStringOption((option) => option.setName('role').setDescription('Роль для снятия').setRequired(true)) as SlashCommandBuilder;

const tempRoleCommand = new SlashCommandBuilder()
  .setName('temp-role')
  .setDescription('Временная выдача роли')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
  .addStringOption((option) => option.setName('role').setDescription('Роль для выдачи').setRequired(true))
  .addStringOption((option) => option.setName('duration').setDescription('Длительность временной роли').setRequired(true)) as SlashCommandBuilder;

export const addRole: Command = {
  data: addRoleCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    await executeRoleInteraction({ interaction, action: 'add' });
  },
  async executeMessage(message: Message, args: string[]) {
    await executeRoleMessage({ message, action: 'add', args });
  }
};

export const takeRole: Command = {
  data: takeRoleCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    await executeRoleInteraction({ interaction, action: 'remove' });
  },
  async executeMessage(message: Message, args: string[]) {
    await executeRoleMessage({ message, action: 'remove', args });
  }
};

export const tempRole: Command = {
  data: tempRoleCommand,
  async execute(interaction: ChatInputCommandInteraction) {
    await executeRoleInteraction({ interaction, action: 'temp' });
  },
  async executeMessage(message: Message, args: string[]) {
    await executeRoleMessage({ message, action: 'temp', args });
  }
};