import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  type ContainerComponentData,
  type ComponentInContainerData,
  type Guild,
  type SeparatorComponentData,
  type TextDisplayComponentData,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { clearExpiredMutes, clearMute, listMutes } from '../../services/muteService.js';
import { createEmojiFormatter } from '../emoji.js';

const PAGE_SIZE = 5;

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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function pluralize(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatRelativeTime(ms: number): string {
  if (ms <= 0) return 'Срок истек';
  const minutes = Math.ceil(ms / (60 * 1000));
  if (minutes < 60) {
    return `Через ${minutes} ${pluralize(minutes, 'минуту', 'минуты', 'минут')}`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `Через ${hours} ${pluralize(hours, 'час', 'часа', 'часов')}`;
  }

  const days = Math.ceil(hours / 24);
  return `Через ${days} ${pluralize(days, 'день', 'дня', 'дней')}`;
}

type MuteEntry = {
  userId: string;
  expiresAt: Date;
  reason: string | null;
};

async function fetchActiveMutes(guild: Guild): Promise<MuteEntry[]> {
  const now = new Date();
  await clearExpiredMutes({ guildId: guild.id, now });

  const records = await listMutes(guild.id);
  const active: MuteEntry[] = [];

  await Promise.all(
    records.map(async (record) => {
      const userId = record.userId.toString();
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        await clearMute({ guildId: guild.id, userId });
        return;
      }

      const until = member.communicationDisabledUntilTimestamp ?? 0;
      if (!until || until <= Date.now()) {
        await clearMute({ guildId: guild.id, userId });
        return;
      }

      active.push({
        userId,
        expiresAt: new Date(until),
        reason: record.reason
      });
    })
  );

  active.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  return active;
}

export async function buildMutesView(options: {
  guild: Guild;
  page: number;
}): Promise<TopLevelComponentData[]> {
  const { guild } = options;
  const activeMutes = await fetchActiveMutes(guild);

  const totalPages = Math.max(1, Math.ceil(activeMutes.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageItems = activeMutes.slice(startIndex, startIndex + PAGE_SIZE);

  const components: ComponentInContainerData[] = [
    buildTextLine('# Список активных мьютов'),
    buildSeparator()
  ];

  if (pageItems.length === 0) {
    components.push(buildTextLine('Нет активных мьютов.'));
  } else {
    pageItems.forEach((item, index) => {
      const position = startIndex + index + 1;
      const formattedDate = formatDateTime(item.expiresAt);
      const relative = formatRelativeTime(item.expiresAt.getTime() - Date.now());
      const reason = item.reason ?? 'Не указана';

      components.push(
        buildTextLine(`**${position}. <@${item.userId}> ( ID: \`${item.userId}\` )**`),
        buildTextLine(`**Действует до:** \`${formattedDate}\` (\`${relative}\`)`),
        buildTextLine(`**Причина:** *${reason}*`),
        buildSeparator()
      );
    });

    components.push(buildTextLine(`Страница ${page} из ${totalPages}`));

    const formatEmoji = await createEmojiFormatter({
      client: guild.client,
      guildId: guild.id,
      guildEmojis: guild.emojis.cache.values()
    });

    const firstButton = new ButtonBuilder()
      .setCustomId(buildCustomId('mutes', 'page', 'first', '1'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('angledoublesmallleft'))
      .setDisabled(page <= 1);

    const prevButton = new ButtonBuilder()
      .setCustomId(buildCustomId('mutes', 'page', 'prev', String(Math.max(1, page - 1))))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallleft'))
      .setDisabled(page <= 1);

    const nextButton = new ButtonBuilder()
      .setCustomId(buildCustomId('mutes', 'page', 'next', String(Math.min(totalPages, page + 1))))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('anglesmallright'))
      .setDisabled(page >= totalPages);

    const lastButton = new ButtonBuilder()
      .setCustomId(buildCustomId('mutes', 'page', 'last', String(totalPages)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(formatEmoji('angledoublesmallright'))
      .setDisabled(page >= totalPages);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      firstButton,
      prevButton,
      nextButton,
      lastButton
    );

    components.push(buttonRow.toJSON());
  }

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}