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
import { ALLOW_SETNICK, enforceInteractionAllow, enforceMessageAllow } from './allow.js';
import { setPendingActionModerator } from '../../services/actionLogState.js';

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

function buildSetnickHintView(): TopLevelComponentData[] {
  const components: ComponentInContainerData[] = [
    buildTextLine('# Команда setnick'),
    buildTextLine('*Изменение отображаемого никнейма пользователя на сервере.*'),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Использование:**'),
    buildTextLine('> *c.setnick <@пользователь> [nickname]*'),
    buildSeparator(),
    buildTextLine('\u200B'),
    buildTextLine('**Пример:**'),
    buildTextLine('> *c.setnick <@пользователь> Россия*')
  ];

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

async function buildSuccessView(options: {
  moderatorMention: string;
  targetMention: string;
  nickname: string;
  formatEmoji: (name: string) => string;
}): Promise<TopLevelComponentData[]> {
  const { moderatorMention, targetMention, nickname, formatEmoji } = options;

  const headerContent = `${formatEmoji('verify')} Отображаемый никнейм пользователя ${targetMention} успешно изменен!`;
  const components: ComponentInContainerData[] = [];

  components.push(buildTextLine(`**${headerContent}**`));
  components.push(buildSeparator());
  components.push(buildTextLine(`**Администратор:** *${moderatorMention}*`));
  components.push(buildTextLine(`**Новый никнейм:** *${nickname}*`));

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}

function hasManageNicknames(interaction: ChatInputCommandInteraction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageNicknames) ?? false;
}

function hasManageNicknamesMessage(message: Message) {
  return message.member?.permissions.has(PermissionsBitField.Flags.ManageNicknames) ?? false;
}

async function resolveGuildMember(options: { guildMembers: GuildMember['guild']['members']; userId: string }) {
  const { guildMembers, userId } = options;

  try {
    return await guildMembers.fetch(userId);
  } catch (error) {
    logger.error(error);
    return null;
  }
}

function validateNickname(nickname: string): 'ok' | 'empty' | 'tooLong' {
  const trimmed = nickname.trim();
  if (!trimmed) return 'empty';
  if (trimmed.length > 32) return 'tooLong';
  return 'ok';
}

const setnickCommand = new SlashCommandBuilder()
  .setName('setnick')
  .setDescription('Изменение отображаемого никнейма пользователя на сервере')
  .addUserOption((option) => option.setName('user').setDescription('Пользователь').setRequired(true))
  .addStringOption((option) =>
    option
      .setName('nickname')
      .setDescription('Новый отображаемый никнейм')
      .setRequired(true)
      .setMaxLength(32)
  ) as SlashCommandBuilder;

export const setnick: Command = {
  data: setnickCommand,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceInteractionAllow(interaction, ALLOW_SETNICK))) return;

    if (!hasManageNicknames(interaction)) {
      await interaction.reply({
        components: buildTextView('Требуется право **Управление никнеймами**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      await interaction.reply({
        components: buildTextView('У бота нет права **Управление никнеймами**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const nicknameRaw = interaction.options.getString('nickname', true);
    const nickname = nicknameRaw.trim();
    const nicknameValidation = validateNickname(nickname);

    if (nicknameValidation !== 'ok') {
      const components =
        nicknameValidation === 'empty'
          ? buildSetnickHintView()
          : buildTextView('Укажите никнейм длиной до 32 символов.');

      await interaction.reply({
        components,
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const targetMember = await resolveGuildMember({ guildMembers: interaction.guild.members, userId: user.id });

    if (!targetMember) {
      await interaction.reply({
        components: buildTextView('Пользователь не найден на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.manageable) {
      await interaction.reply({
        components: buildTextView('Нельзя изменить отображаемое имя этого пользователя.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: interaction.guild.id,
        targetId: targetMember.id,
        action: 'nickname',
        moderatorId: interaction.user.id
      });
      await targetMember.setNickname(nickname);
    } catch (error) {
      logger.error(error);
      await interaction.reply({
        components: buildTextView('Не удалось изменить никнейм пользователя.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId,
      guildEmojis: interaction.guild.emojis.cache.values()
    });

    await interaction.reply({
      components: await buildSuccessView({
        moderatorMention: interaction.user.toString(),
        targetMention: targetMember.toString(),
        nickname,
        formatEmoji
      }),
      flags: MessageFlags.IsComponentsV2
    });
  },

  async executeMessage(message: Message, args: string[]) {
    if (!message.inGuild()) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!(await enforceMessageAllow(message, ALLOW_SETNICK))) return;

    if (!hasManageNicknamesMessage(message)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Требуется право **Управление никнеймами**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const botMember = message.guild.members.me;
    if (!botMember?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('У бота нет права **Управление никнеймами**.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const [targetRaw, ...nicknameParts] = args;

    if (!targetRaw) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildSetnickHintView(),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const nickname = nicknameParts.join(' ').trim();
    const nicknameValidation = validateNickname(nickname);
    if (nicknameValidation !== 'ok') {
      if (!message.channel?.isSendable()) return;
      const components =
        nicknameValidation === 'empty' ? buildSetnickHintView() : buildTextView('Укажите никнейм длиной до 32 символов.');

      await message.channel.send({
        components,
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const match = targetRaw.match(/^<@!?(\d+)>$/);
    const targetId = match?.[1] ?? targetRaw;

    const targetMember = await resolveGuildMember({
      guildMembers: message.guild.members,
      userId: targetId
    });

    if (!targetMember) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Пользователь не найден на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!targetMember.manageable) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Нельзя изменить отображаемое имя этого пользователя.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      setPendingActionModerator({
        guildId: message.guild.id,
        targetId: targetMember.id,
        action: 'nickname',
        moderatorId: message.author.id
      });
      await targetMember.setNickname(nickname);
    } catch (error) {
      logger.error(error);
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Не удалось изменить никнейм пользователя.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId,
      guildEmojis: message.guild.emojis.cache.values()
    });

    if (!message.channel?.isSendable()) return;

    await message.channel.send({
      components: await buildSuccessView({
        moderatorMention: message.author.toString(),
        targetMention: targetMember.toString(),
        nickname,
        formatEmoji
      }),
      flags: MessageFlags.IsComponentsV2
    });
  }
};