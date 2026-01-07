import {
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type ContainerComponentData,
  type Message,
  type SeparatorComponentData,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { getGuildUserStats, fetchImageBuffer } from '../../services/statsService.js';
import { renderStatsCard } from '../../render/statsCard.js';
import { logger } from '../../shared/logger.js';

const MESSAGE_SEPARATOR_COMPONENT: SeparatorComponentData = { type: ComponentType.Separator };

async function buildStatsAttachment(options: {
  guildId: string;
  user: User;
  displayName: string;
}) {
  const { guildId, user, displayName } = options;
  const stats = await getGuildUserStats(guildId, user.id);

  const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
  const partnerAvatarUrl = avatarUrl;

  const [userAvatar, partnerAvatar] = await Promise.all([
    fetchImageBuffer(avatarUrl),
    fetchImageBuffer(partnerAvatarUrl)
  ]);

  const buffer = await renderStatsCard({
    displayName,
    level: stats.level,
    xp: stats.xp,
    xpToNext: stats.xpToNext,
    messageCount: stats.totalMessageCount,
    voiceMinutes: stats.totalVoiceMinutes,
    streakDays: stats.streakDays,
    userAvatar,
    partnerAvatar
  });

  const attachmentName = `stats-${user.id}.png`;

  return {
    attachment: new AttachmentBuilder(buffer, { name: attachmentName }),
    attachmentName
  };
}

function buildStatsView(displayName: string, attachmentName: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
      { type: ComponentType.TextDisplay, content: `Статистика пользователя **${displayName}**` },
      MESSAGE_SEPARATOR_COMPONENT,
      {
        type: ComponentType.MediaGallery,
        items: [{ media: { url: `attachment://${attachmentName}` } }]
      }
    ]
  };

  return [container];
}

export const stats: Command = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Статистика пользователя'),

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

    if (!interaction.inCachedGuild()) {
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    const displayName = interaction.member?.displayName ?? interaction.user.username;

    try {
      const { attachment, attachmentName } = await buildStatsAttachment({
        guildId: interaction.guildId,
        user: interaction.user,
        displayName
      });

      await interaction.editReply({
        components: buildStatsView(displayName, attachmentName),
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось сформировать статистику. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  async executeMessage(message: Message) {
    const formatEmoji = await createEmojiFormatter({
      client: message.client,
      guildId: message.guildId ?? message.client.application?.id ?? 'global',
      guildEmojis: message.guild?.emojis.cache.values()
    });

    if (!message.inGuild() || !message.guild) {
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
      return;
    }

    try {
      const displayName = message.member?.displayName ?? message.author.username;
      const { attachment, attachmentName } = await buildStatsAttachment({
        guildId: message.guildId,
        user: message.author,
        displayName
      });

      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildStatsView(displayName, attachmentName),
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось сформировать статистику. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};