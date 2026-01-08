import {
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type ContainerComponentData,
  type Guild,
  type Message,
  type TopLevelComponentData,
  type User
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { getGuildUserStats, fetchImageBuffer } from '../../services/statsService.js';
import { renderStatsCard } from '../../render/statsCard.js';
import { logger } from '../../shared/logger.js';
import { getMarriageForUser, type MarriageInfo } from '../../services/marriageService.js';

type PartnerResolveResult = {
  displayName?: string;
  user?: User;
};

function pluralizeRussian(value: number, forms: [string, string, string]) {
  const absValue = Math.abs(value) % 100;
  const lastDigit = absValue % 10;
  if (absValue >= 11 && absValue <= 19) return forms[2];
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
  return forms[2];
}

function formatMarriageDuration(marriage: MarriageInfo) {
  if (marriage.daysTogether < 1) {
    const hours = Math.max(0, marriage.hoursTogether);
    const label = pluralizeRussian(hours, ['час', 'часа', 'часов']);
    return `Вместе: ${hours} ${label}`;
  }

  const label = pluralizeRussian(marriage.daysTogether, ['день', 'дня', 'дней']);
  return `Вместе: ${marriage.daysTogether} ${label}`;
}

async function resolvePartnerUser(options: {
  guild: Guild;
  client: Client;
  partnerId: string;
}): Promise<PartnerResolveResult | null> {
  const { guild, client, partnerId } = options;
  try {
    const member = await guild.members.fetch(partnerId);
    return { displayName: member.displayName, user: member.user };
  } catch (error) {
    logger.error(error);
  }

  try {
    const user = await client.users.fetch(partnerId);
    return { user };
  } catch (error) {
    logger.error(error);
  }

  return null;
}

async function buildStatsAttachment(options: {
  guildId: string;
  user: User;
  displayName: string;
  guild: Guild;
  client: Client;
}) {
  const { guildId, user, displayName, guild, client } = options;

  const stats = await getGuildUserStats(guildId, user.id);

  const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
  const userAvatar = await fetchImageBuffer(avatarUrl);

  const marriage = await getMarriageForUser(guildId, user.id);

  let partnerName = 'Холост';
  let partnerAvatar: Buffer | null = null;
  let partnerDurationLabel = '';

  if (marriage) {
    partnerDurationLabel = formatMarriageDuration(marriage);
    const partner = await resolvePartnerUser({ guild, client, partnerId: marriage.partnerId });
    if (partner?.displayName) {
      partnerName = partner.displayName;
    } else if (partner?.user) {
      partnerName = partner.user.username;
    }

    if (partner?.user) {
      const partnerAvatarUrl = partner.user.displayAvatarURL({ extension: 'png', size: 256 });
      try {
        partnerAvatar = await fetchImageBuffer(partnerAvatarUrl);
      } catch (error) {
        logger.error(error);
      }
    }
  }

  const buffer = await renderStatsCard({
    displayName,
    level: stats.level,
    xp: stats.xp,
    xpToNext: stats.xpToNext,
    xpRemaining: stats.xpRemaining,
    messageCount: stats.totalMessageCount,
    voiceHours: Math.floor(stats.totalVoiceMinutes / 60),
    messageRank: stats.messageRank,
    donationAmount: 0,
    streakDays: stats.streakDays,
    partnerName,
    partnerDurationLabel,
    userAvatar,
    partnerAvatar
  });

  const attachmentName = `stats-${user.id}.png`;

  return {
    attachment: new AttachmentBuilder(buffer, { name: attachmentName }),
    attachmentName
  };
}

function buildStatsView(attachmentName: string): TopLevelComponentData[] {
  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: [
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

    await interaction.deferReply();

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
        displayName,
        guild: interaction.guild,
        client: interaction.client
      });

      await interaction.editReply({
        components: buildStatsView(attachmentName),
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

  async executeMessage(message: Message, _args: string[]) {
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
        displayName,
        guild: message.guild,
        client: message.client
      });

      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildStatsView(attachmentName),
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