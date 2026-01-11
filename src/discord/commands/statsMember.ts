import {
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type ContainerComponentData,
  type Message,
  type TopLevelComponentData
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildWarningView } from '../responses/messageBuilders.js';
import { getMemberStatsSummary } from '../../services/memberStatsService.js';
import { renderMemberStatsCard } from '../../render/memberStatsCard.js';
import { logger } from '../../shared/logger.js';

const DEFAULT_DAYS = 14;

function buildStatsMemberView(attachmentName: string): TopLevelComponentData[] {
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

async function buildStatsMemberAttachment(options: { guildId: string; memberCount: number }) {
  const summary = await getMemberStatsSummary({
    guildId: options.guildId,
    currentMemberCount: options.memberCount,
    days: DEFAULT_DAYS
  });

  const buffer = await renderMemberStatsCard({
    memberCount: options.memberCount,
    totalJoins: summary.totalJoins,
    totalLeaves: summary.totalLeaves,
    points: summary.points
  });

  const attachmentName = `stats-member-${options.guildId}.png`;

  return {
    attachment: new AttachmentBuilder(buffer, { name: attachmentName }),
    attachmentName
  };
}

async function sendStatsMember(options: { guildId: string; memberCount: number; reply: (payload: object) => Promise<unknown> }) {
  const { attachment, attachmentName } = await buildStatsMemberAttachment({
    guildId: options.guildId,
    memberCount: options.memberCount
  });

  await options.reply({
    components: buildStatsMemberView(attachmentName),
    files: [attachment],
    flags: MessageFlags.IsComponentsV2
  });
}

export const statsMembers: Command = {
  data: new SlashCommandBuilder()
    .setName('stats-members')
    .setDescription('Статистика участников сервера'),
  defer: false,

  async execute(interaction: ChatInputCommandInteraction) {
    const formatEmoji = await createEmojiFormatter({
      client: interaction.client,
      guildId: interaction.guildId ?? interaction.client.application?.id ?? 'global',
      guildEmojis: interaction.guild?.emojis.cache.values()
    });

    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        components: buildWarningView(formatEmoji, 'Команда доступна только внутри сервера.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    try {
      await interaction.deferReply();
      await sendStatsMember({
        guildId: interaction.guildId,
        memberCount: interaction.guild.memberCount,
        reply: (payload) => interaction.editReply(payload)
      });
    } catch (error) {
      logger.error(error);
      await interaction.editReply({
        components: buildWarningView(formatEmoji, 'Не удалось сформировать график. Попробуйте позже.'),
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
      if (!message.channel?.isSendable()) return;
      await sendStatsMember({
        guildId: message.guildId,
        memberCount: message.guild.memberCount,
        reply: (payload) => message.channel.send(payload)
      });
    } catch (error) {
      logger.error(error);
      if (message.channel?.isSendable()) {
        await message.channel.send({
          components: buildWarningView(formatEmoji, 'Не удалось сформировать график. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};