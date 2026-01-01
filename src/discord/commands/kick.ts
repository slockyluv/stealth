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
  type GuildMemberManager
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { logger } from '../../shared/logger.js';
import { ALLOW_KICK, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { setPendingActionModerator } from '../../services/actionLogState.js';
import { buildUsageView, buildWarningView } from '../responses/messageBuilders.js';

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

function buildKickHintView(formatEmoji: (name: string) => string): TopLevelComponentData[] {
  return buildUsageView(formatEmoji, '!kick <@Пользователь> [Причина]');
}

async function buildKickSuccessView(options: {
  moderatorMention: string;
  targetMention: string;
  reason?: string;
  formatEmoji: (name: string) => string;
}): Promise<TopLevelComponentData[]> {
  const { moderatorMention, targetMention, reason, formatEmoji } = options;

  const headerContent = `${formatEmoji('userforbiddenalt')} Пользователь ${targetMention} успешно кикнут!`;
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

function buildTextView(text: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [buildTextLine(text)]
  };

  return [container];
}

function hasKickMembers(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.KickMembers) ?? false;
}

function hasKickMembersMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.KickMembers) ?? false;
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

const kickCommand = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Выгнать пользователя с сервера')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь для кика').setRequired(true))
  .addStringOption((option) => option.setName('reason').setDescription('Причина кика')) as SlashCommandBuilder;

export const kick: Command = {
  data: kickCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_KICK, { formatEmoji }))) return;

    if (!hasKickMembers(interaction)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Требуется право **Выгонять участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'У бота нет права **Выгонять участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason')?.trim() || undefined;

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть самого себя!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (targetUser.id === interaction.client.user?.id) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть бота!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveTargetMember({
      userId: targetUser.id,
      guildMembers: interaction.guild.members
    });

    if (!targetMember) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Указанный пользователь не найден на сервере!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.kickable) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть указанного пользователя!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: interaction.guild.id,
        targetId: targetUser.id,
        action: 'kick',
        moderatorId: interaction.user.id
      });
      await targetMember.kick(reason ?? undefined);
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Не удалось кикнуть пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildKickSuccessView({
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
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_KICK, { formatEmoji }))) return;

    if (!hasKickMembersMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Требуется право **Выгонять участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = message.guild.members.me;
    if (!botMember?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'У бота нет права **Выгонять участников**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw, ...reasonParts] = args;

    if (!targetRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildKickHintView(formatEmoji),
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
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть самого себя!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (targetId === message.client.user?.id) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть бота!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveTargetMember({
      userId: targetId,
      guildMembers: message.guild.members
    });

    if (!targetMember) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Пользователь не найден на сервере!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.kickable) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Невозможно кикнуть указанного пользователя!'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: message.guild.id,
        targetId: targetMember.id,
        action: 'kick',
        moderatorId: message.author.id
      });
      await targetMember.kick(reason ?? undefined);
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildWarningView(formatEmoji, 'Не удалось кикнуть пользователя. Проверьте права бота.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const view = await buildKickSuccessView({
      moderatorMention: `<@${message.author.id}>`,
      targetMention: `<@${targetMember.id}>`,
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