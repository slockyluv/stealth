import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionsBitField,
  type Message,
  MessageFlags,
  ComponentType,
  type ContainerComponentData,
  type ComponentInContainerData,
  type GuildMemberManager,
  type SeparatorComponentData,
  type TextDisplayComponentData,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { logger } from '../../shared/logger.js';
import { ALLOW_BAN, ALLOW_UNBAN, enforceInteractionAllow, enforceMessageAllow } from './allow.js';

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

function buildBanHintView(): TopLevelComponentData[] {
  const components: ComponentInContainerData[] = [
    buildTextLine('# Команда ban'),
    buildTextLine(
      '*Блокировка отправления сообщений в чат у указанного пользователя. Выдается на определенное время за нарушение правил сервера.*'
    ),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Использование:**'),
    buildTextLine('> *c.ban <@пользователь> [Причина]*'),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Пример:**'),
    buildTextLine('> *c.ban @пользователь реклама*')
  ];

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

async function buildBanSuccessView(options: {
  moderatorMention: string;
  targetMention: string;
  reason?: string;
  formatEmoji: (name: string) => string;
}): Promise<TopLevelComponentData[]> {
  const { moderatorMention, targetMention, reason, formatEmoji } = options;

  const headerContent = `${formatEmoji('userforbiddenalt')} Пользователь ${targetMention} успешно заблокирован!`;
  const components: ComponentInContainerData[] = [];

  components.push(buildTextLine(`**${headerContent}**`));
  components.push(buildSeparator());
  components.push(buildTextLine(`**Администратор:** *${moderatorMention}*`));
  components.push(buildTextLine(`**Причина:** *${reason ?? 'Не указана'}*`));

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

function buildUnbanView(options: { targetMention: string; formatEmoji: (name: string) => string }) {
  const { targetMention, formatEmoji } = options;

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      buildTextLine(`${formatEmoji('verify')} Пользователь "${targetMention}" разблокирован на сервере!`)
    ]
  };

  return [container];
}

function buildTextView(text: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(text)]
  };

  return [container];
}

function hasBanMembers(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers) ?? false;
}

function hasBanMembersMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.BanMembers) ?? false;
}

async function resolveTargetMember(options: { userId: string; guildMembers: GuildMemberManager }) {
  const { guildMembers, userId } = options;
  try {
    return await guildMembers.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

async function fetchUser(options: { userId: string; fetcher: ChatInputCommandInteraction['client']['users'] }) {
  const { userId, fetcher } = options;
  try {
    return await fetcher.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

const banCommand = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Блокировка пользователя на сервере')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь для блокировки').setRequired(true))
  .addStringOption((option) => option.setName('reason').setDescription('Причина блокировки')) as SlashCommandBuilder;

export const ban: Command = {
  data: banCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_BAN))) return;

    if (!hasBanMembers(interaction)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Банить участников**.'),
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
    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await interaction.reply({
        components: buildTextView('У бота нет права **Банить участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || undefined;

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно заблокировать самого себя!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (targetUser.id === interaction.client.user?.id) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно выдать блокировку на сервере боту!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveTargetMember({
      userId: targetUser.id,
      guildMembers: interaction.guild.members
    });

    if (targetMember && !targetMember.bannable) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно заблокировать указанного пользователя!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.guild.members.ban(targetUser, { reason: reason ?? undefined });
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildTextView('Не удалось заблокировать пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildBanSuccessView({
      moderatorMention: `<@${interaction.user.id}>`,
      targetMention: `<@${targetUser.id}>`,
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

    if (!(await enforceMessageAllow(message, ALLOW_BAN))) return;

    if (!hasBanMembersMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Требуется право **Банить участников**.'),
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
    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('У бота нет права **Банить участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw, ...reasonParts] = args;

    if (!targetRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildBanHintView(),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const match = targetRaw.match(/^<@!?(\d+)>$/);
    const targetId = match?.[1] ?? targetRaw;
    const reason = reasonParts.join(' ').trim() || undefined;

    if (targetId === message.author.id) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно заблокировать самого себя!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (targetId === message.client.user?.id) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно выдать блокировку на сервере боту!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = await fetchUser({ userId: targetId, fetcher: message.client.users });
    if (!targetUser) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveTargetMember({
      userId: targetUser.id,
      guildMembers: message.guild.members
    });

    if (targetMember && !targetMember.bannable) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Невозможно заблокировать указанного пользователя!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await message.guild.members.ban(targetUser, { reason: reason ?? undefined });
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось заблокировать пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildBanSuccessView({
      moderatorMention: `<@${message.author.id}>`,
      targetMention: `<@${targetUser.id}>`,
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

const unbanCommand = new SlashCommandBuilder()
  .setName('unban')
  .setDescription('Разблокировка пользователя на сервере')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь для разблокировки').setRequired(true)) as SlashCommandBuilder;

export const unban: Command = {
  data: unbanCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_UNBAN))) return;

    if (!hasBanMembers(interaction)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Банить участников**.'),
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
    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await interaction.reply({
        components: buildTextView('У бота нет права **Банить участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    const banInfo = await interaction.guild.bans.fetch(targetUser.id).catch(() => null);
    if (!banInfo) {
      await interaction.reply({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден в списке заблокированных!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.guild.bans.remove(targetUser.id);
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildTextView('Не удалось разблокировать пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = buildUnbanView({
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

    if (!(await enforceMessageAllow(message, ALLOW_UNBAN))) return;

    if (!hasBanMembersMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Требуется право **Банить участников**.'),
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
    if (!botMember?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('У бота нет права **Банить участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw] = args;

    if (!targetRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(
          `**${formatEmoji('staff_warn')} Укажите пользователя для снятия блокировки на сервере!**`
        ),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const match = targetRaw.match(/^<@!?(\d+)>$/);
    const targetId = match?.[1] ?? targetRaw;

    const banInfo = await message.guild.bans.fetch(targetId).catch(() => null);
    if (!banInfo) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView(`**${formatEmoji('staff_warn')} Пользователь не найден в списке заблокированных!**`),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await message.guild.bans.remove(targetId);
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось разблокировать пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = buildUnbanView({
      targetMention: `<@${targetId}>`,
      formatEmoji
    });

    if (!message.channel?.isSendable()) return;
    await message.channel.send({
      components: view,
      flags: MessageFlags.IsComponentsV2
    });
  }
};