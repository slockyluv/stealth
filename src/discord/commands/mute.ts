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
  type GuildMember
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { logger } from '../../shared/logger.js';
import { clearMute, upsertMute } from '../../services/muteService.js';
import { ALLOW_MUTE, ALLOW_UNMUTE, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { setPendingActionModerator } from '../../services/actionLogState.js';

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

const DURATION_MULTIPLIERS: Record<string, number> = {
  s: 1000,
  c: 1000,
  'с': 1000,
  m: 60 * 1000,
  'м': 60 * 1000,
  'мин': 60 * 1000,
  h: 60 * 60 * 1000,
  'ч': 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  'д': 24 * 60 * 60 * 1000,
  'дн': 24 * 60 * 60 * 1000
};

const DURATION_LABELS: Record<string, string> = {
  s: 'с',
  c: 'с',
  'с': 'с',
  m: 'м',
  'м': 'м',
  'мин': 'м',
  h: 'ч',
  'ч': 'ч',
  d: 'д',
  'д': 'д',
  'дн': 'д'
};

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

function buildMuteHintView(): TopLevelComponentData[] {
  const components: ComponentInContainerData[] = [
    buildTextLine('# Команда mute'),
    buildTextLine(
      '*Блокировка отправления сообщений в чат у указанного пользователя. Выдается на определенное время за нарушение правил сервера.*'
    ),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Использование:**'),
    buildTextLine('> *c.mute <@пользователь> [Длительность] [Причина]*'),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Пример:**'),
    buildTextLine('> *c.mute @пользователь 30м flud*')
  ];

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

function parseDuration(input: string): { ms: number; label: string } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d+)\s*([a-zA-Zа-яА-Я]+)$/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const unit = match[2]?.toLowerCase();
  if (!unit) return null;

  const multiplier = DURATION_MULTIPLIERS[unit];
  if (!multiplier) return null;

  const ms = value * multiplier;
  if (ms > MAX_TIMEOUT_MS) return null;

  const labelUnit = DURATION_LABELS[unit] ?? unit;
  return { ms, label: `${value}${labelUnit}` };
}

async function buildMuteSuccessView(options: {
  moderatorMention: string;
  targetMention: string;
  durationLabel: string;
  reason?: string;
  formatEmoji: (name: string) => string;
}): Promise<TopLevelComponentData[]> {
  const { moderatorMention, targetMention, durationLabel, reason, formatEmoji } = options;

  const headerContent = `${formatEmoji('action_mute')} Пользователь ${targetMention} успешно замьючен!`;
  const components: ComponentInContainerData[] = [];

  components.push(buildTextLine(`**${headerContent}**`));
  components.push(buildSeparator());
  components.push(buildTextLine(`**Администратор:** *${moderatorMention}*`));
  components.push(buildTextLine(`**Длительность:** *${durationLabel}*`));
  components.push(buildTextLine(`**Причина:** *${reason ?? 'Не указана'}*`));

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

function buildUnmuteView(options: { targetMention: string; formatEmoji: (name: string) => string }) {
  const { targetMention, formatEmoji } = options;
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      buildTextLine(`${formatEmoji('verify')} С пользователя "${targetMention}" снята блокировка чата.`)
    ]
  };

  return [container];
}

function hasModerateMembers(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers) ?? false;
}

function hasModerateMembersMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers) ?? false;
}

async function resolveTargetMember(options: {
  guildMembers: GuildMember['guild']['members'];
  userId: string;
}): Promise<GuildMember | null> {
  const { guildMembers, userId } = options;
  try {
    return await guildMembers.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

async function applyMute(options: {
  targetMember: GuildMember;
  durationMs: number;
  reason?: string;
}) {
  const { targetMember, durationMs, reason } = options;
  await targetMember.timeout(durationMs, reason ?? undefined);
}

async function applyUnmute(options: { targetMember: GuildMember; reason?: string }) {
  const { targetMember, reason } = options;
  await targetMember.timeout(null, reason ?? undefined);
}

const muteCommand = new SlashCommandBuilder()
  .setName('mute')
  .setDescription('Блокировка отправления сообщений в чат')
  .addUserOption((option) =>
    option.setName('user').setDescription('Пользователь для блокировки').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('duration').setDescription('Длительность блокировки').setRequired(true)
  )
  .addStringOption((option) => option.setName('reason').setDescription('Причина блокировки')) as SlashCommandBuilder;

export const mute: Command = {
  data: muteCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_MUTE))) return;

    if (!hasModerateMembers(interaction)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guild.id,
      guildEmojis: interaction.guild.emojis.cache.values()
    });
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      await interaction.reply({
        components: buildTextView('У бота нет права **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const durationInput = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason')?.trim() ?? undefined;

    const duration = parseDuration(durationInput);
    if (!duration) {
      await interaction.reply({
        components: buildMuteHintView(),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveTargetMember({
      guildMembers: interaction.guild.members,
      userId: targetUser.id
    });

    if (!targetMember) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Блокировку чата невозможно выдать указанному пользователю!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: interaction.guild.id,
        targetId: targetUser.id,
        action: 'mute',
        moderatorId: interaction.user.id
      });
      await applyMute({
        targetMember,
        durationMs: duration.ms,
        reason
      });
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildTextView('Не удалось выдать блокировку. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await upsertMute({
        guildId: interaction.guild.id,
        userId: targetUser.id,
        moderatorId: interaction.user.id,
        reason,
        expiresAt: new Date(Date.now() + duration.ms)
      });
    } catch (error) {
      logger.error(error);
    }

    const view = await buildMuteSuccessView({
      moderatorMention: `<@${interaction.user.id}>`,
      targetMention: `<@${targetUser.id}>`,
      durationLabel: duration.label,
      reason,
      formatEmoji
    });

    await interaction.reply({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_MUTE))) return;

    if (!hasModerateMembersMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Требуется право **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = message.guild.members.me;
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guild.id,
      guildEmojis: message.guild.emojis.cache.values()
    });
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('У бота нет права **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw, durationRaw, ...reasonParts] = args;

    if (!targetRaw || !durationRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildMuteHintView(),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const duration = parseDuration(durationRaw);
    if (!duration) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildMuteHintView(),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const match = targetRaw.match(/^<@!?(\d+)>$/);
    const targetId = match?.[1] ?? targetRaw;

    const targetMember = await resolveTargetMember({
      guildMembers: message.guild.members,
      userId: targetId
    });

    if (!targetMember) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.moderatable) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Блокировку чата невозможно выдать указанному пользователю!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const reason = reasonParts.join(' ').trim() || undefined;

    try {
      setPendingActionModerator({
        guildId: message.guild.id,
        targetId: targetMember.id,
        action: 'mute',
        moderatorId: message.author.id
      });
      await applyMute({
        targetMember,
        durationMs: duration.ms,
        reason
      });
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось выдать блокировку. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await upsertMute({
        guildId: message.guild.id,
        userId: targetMember.id,
        moderatorId: message.author.id,
        reason,
        expiresAt: new Date(Date.now() + duration.ms)
      });
    } catch (error) {
      logger.error(error);
    }

    const view = await buildMuteSuccessView({
      moderatorMention: `<@${message.author.id}>`,
      targetMention: `<@${targetMember.id}>`,
      durationLabel: duration.label,
      reason,
      formatEmoji
    });

    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  }
};

function buildTextView(text: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(text)]
  };

  return [container];
}

const unmuteCommand = new SlashCommandBuilder()
  .setName('unmute')
  .setDescription('Снятие блокировки чата')
  .addUserOption((option) =>
    option.setName('user').setDescription('Пользователь для снятия блокировки').setRequired(true)
  ) as SlashCommandBuilder;

export const unmute: Command = {
  data: unmuteCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_UNMUTE))) return;

    if (!hasModerateMembers(interaction)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guild.id,
      guildEmojis: interaction.guild.emojis.cache.values()
    });
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      await interaction.reply({
        components: buildTextView('У бота нет права **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const targetMember = await resolveTargetMember({
      guildMembers: interaction.guild.members,
      userId: targetUser.id
    });

    if (!targetMember) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Блокировку чата невозможно снять указанному пользователю!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: interaction.guild.id,
        targetId: targetUser.id,
        action: 'unmute',
        moderatorId: interaction.user.id
      });
      await applyUnmute({ targetMember });
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildTextView('Не удалось снять блокировку. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await clearMute({ guildId: interaction.guild.id, userId: targetUser.id });
    } catch (error) {
      logger.error(error);
    }

    const view = buildUnmuteView({
      targetMention: `<@${targetUser.id}>`,
      formatEmoji
    });

    await interaction.reply({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_UNMUTE))) return;

    if (!hasModerateMembersMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Требуется право **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = message.guild.members.me;
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guild.id,
      guildEmojis: message.guild.emojis.cache.values()
    });
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('У бота нет права **Модерация участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw] = args;
    if (!targetRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Укажите пользователя для снятия блокировки чата!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const match = targetRaw.match(/^<@!?(\d+)>$/);
    const targetId = match?.[1] ?? targetRaw;

    const targetMember = await resolveTargetMember({
      guildMembers: message.guild.members,
      userId: targetId
    });

    if (!targetMember) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.moderatable) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Блокировку чата невозможно снять указанному пользователю!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: message.guild.id,
        targetId: targetMember.id,
        action: 'unmute',
        moderatorId: message.author.id
      });
      await applyUnmute({ targetMember });
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось снять блокировку. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await clearMute({ guildId: message.guild.id, userId: targetMember.id });
    } catch (error) {
      logger.error(error);
    }

    const view = buildUnmuteView({
      targetMention: `<@${targetMember.id}>`,
      formatEmoji
    });

    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  }
};