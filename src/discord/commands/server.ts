import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  userMention,
  MessageFlags
} from 'discord.js';
import { logger } from '../../shared/logger.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildTextView } from '../components/v2Message.js';

const numberFormatter = new Intl.NumberFormat('ru-RU');

function formatFullDateTime(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatRequestTimestamp(date: Date) {
  const now = new Date();
  const midnightNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const midnightTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const dayDiff = Math.floor((midnightNow.getTime() - midnightTarget.getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);

  if (dayDiff === 0) {
    return `Сегодня, ${time}`;
  }

  if (dayDiff === 1) {
    return `Вчера, ${time}`;
  }

  const datePart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  return `${datePart}, ${time}`;
}

export const server: Command = {
  data: new SlashCommandBuilder().setName('server').setDescription('Показывает информацию о сервере'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        components: buildTextView('Эта команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    await interaction.deferReply();

    try {
      const [channels, emojis] = await Promise.all([
        interaction.guild.channels.fetch(),
        interaction.guild.emojis.fetch()
      ]);

      const validChannels = channels.filter((channel): channel is NonNullable<typeof channel> => channel !== null);

      const totalMembers = interaction.guild.memberCount;
      const cachedMembers = interaction.guild.members.cache;
      const botCount = cachedMembers.filter((member) => member.user.bot).size;
      const humanCount = Math.max(totalMembers - botCount, 0);

      let online = 0;
      let idle = 0;
      let dnd = 0;

      for (const presence of interaction.guild.presences.cache.values()) {
        const status = presence.status ?? 'offline';
        if (status === 'online') online += 1;
        else if (status === 'idle') idle += 1;
        else if (status === 'dnd') dnd += 1;
      }

      const offline = Math.max(totalMembers - online - idle - dnd, 0);

      const voiceChannels = validChannels.filter(
        (channel) =>
          channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice
      ).size;

      const textChannels = validChannels.filter(
        (channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement
      ).size;

      const totalChannels = validChannels.filter(
        (channel) => channel.isTextBased() || channel.isVoiceBased()
      ).size;

      const ownerMention = userMention(interaction.guild.ownerId);
      const emoji = await createEmojiFormatter({
        client: interaction.client,
        guildId: interaction.guild.id,
        guildEmojis: emojis.values()
      });

      const description = [
        `**${emoji('information')} Информация о сервере**`,
        `Сервер: **${interaction.guild.name}**`,
        '',
        `> **${emoji('family')} Участники**`,
        `${emoji('more')} ➜  Всего: \`${numberFormatter.format(totalMembers)}\``,
        `${emoji('bots')} ➜  Ботов: \`${numberFormatter.format(botCount)}\``,
        `${emoji('user')} ➜  Людей: \`${numberFormatter.format(humanCount)}\``,
        '',
        `> **${emoji('channel')} Каналы**`,
        `${emoji('voice_chat')} ➜  Голосовые: \`${numberFormatter.format(voiceChannels)}\``,
        `${emoji('message')} ➜  Текстовые: \`${numberFormatter.format(textChannels)}\``,
        `${emoji('more')} ➜  Всего: \`${numberFormatter.format(totalChannels)}\``,
        '',
        `> **${emoji('star')} Статусы пользователей**`,
        `${emoji('online')} ➜  В сети: \`${numberFormatter.format(online)}\``,
        `${emoji('noactive')} ➜  Неактивны: \`${numberFormatter.format(idle)}\``,
        `${emoji('disturb')} ➜  Не беспокоить: \`${numberFormatter.format(dnd)}\``,
        `${emoji('offline')} ➜  Не в сети: \`${numberFormatter.format(offline)}\``,
        '',
        `> **${emoji('list')} Сервер**`,
        `${emoji('action_profile')} ➜  Бустов: \`${numberFormatter.format(interaction.guild.premiumSubscriptionCount ?? 0)}\``,
        `${emoji('clock')} ➜  Сервер создан: \`${formatFullDateTime(interaction.guild.createdAt)}\``,
        `${emoji('promo')} ➜  Всего эмодзи: \`${numberFormatter.format(emojis.size)}\``,
        `${emoji('owner')} ➜  Владелец сервера: ${ownerMention}`,
        '',
        `Запрос от: ${interaction.user.username} • ${formatRequestTimestamp(new Date())}`
      ].join('\n');

      await interaction.editReply({
        components: buildTextView(description),
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          components: buildTextView('Не удалось получить информацию о сервере. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        await interaction.reply({
          components: buildTextView('Не удалось получить информацию о сервере. Попробуйте позже.'),
          flags: MessageFlags.IsComponentsV2
        });
      }
    }
  }
};