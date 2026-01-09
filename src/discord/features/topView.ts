import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type ContainerComponentData,
  type ComponentInContainerData,
  type Guild,
  type SeparatorComponentData,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../shared/customId.js';
import { getTopPage, type TopEntry, type TopSection } from '../../services/topService.js';
import { createEmojiFormatter } from '../emoji.js';
import { MESSAGE_SEPARATOR_COMPONENT } from './applications/config.js';

const PAGE_SIZE = 10;

export const TOP_SECTIONS: TopSection[] = ['levels', 'messages', 'voice', 'streak'];

const SECTION_LABELS: Record<TopSection, string> = {
  levels: 'Уровень пользователя',
  messages: 'Отправленные сообщения',
  voice: 'Голосовая активность',
  streak: 'Непрерывность активности'
};

export function isTopSection(value: string): value is TopSection {
  return TOP_SECTIONS.includes(value as TopSection);
}

function buildSeparator(): SeparatorComponentData {
  return MESSAGE_SEPARATOR_COMPONENT;
}

function formatRank(index: number): string {
  if (index === 1) return ':first_place:';
  if (index === 2) return ':second_place:';
  if (index === 3) return ':third_place:';
  return `${index}.`;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `*${hours} ч. ${minutes} м.*`;
}

function pluralizeDays(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

function buildEntryLine(section: TopSection, entry: TopEntry, position: number): ComponentInContainerData {
  const userLine = `${formatRank(position)} <@${entry.userId}>`;
  let detailLine = '';

  if (section === 'levels') {
    const xp = Math.floor(entry.xp);
    const xpToNext = entry.xpToNext;
    detailLine = `**Уровень:** *${entry.level}* (\`${xp}/${xpToNext}\`)`;
  } else if (section === 'messages') {
    detailLine = `**Сообщений:** *${entry.totalMessageCount}*`;
  } else if (section === 'voice') {
    detailLine = `**Голосовая активность:** ${formatMinutes(entry.totalVoiceMinutes)}`;
  } else {
    const daysLabel = pluralizeDays(entry.maxStreakDays);
    detailLine = `**Непрерывность активности:** *${entry.maxStreakDays}* ${daysLabel}`;
  }

  return { type: ComponentType.TextDisplay, content: `${userLine}\n${detailLine}` };
}

function resolveSectionEmoji(section: TopSection): string {
  if (section === 'levels') return 'star';
  if (section === 'messages') return 'message';
  if (section === 'voice') return 'voice_chat';
  return 'message';
}

export async function buildTopView(options: {
  guild: Guild;
  section: TopSection;
  page: number;
}): Promise<TopLevelComponentData[]> {
  const { guild, section, page } = options;
  const formatEmoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: guild.emojis.cache.values()
  });

  const pageData = await getTopPage({
    guildId: guild.id,
    section,
    page,
    pageSize: PAGE_SIZE
  });

  const components: ComponentInContainerData[] = [];

  const trophyEmoji = formatEmoji('trophy');
  const introText =
    '```Общайтесь в текстовых и голосовых каналах, участвуйте в обсуждениях и становитесь частью жизни сервера. Активные пользователи будут получать поощрения.```';

  components.push(
    { type: ComponentType.TextDisplay, content: `# ${trophyEmoji} Список лидеров` },
    { type: ComponentType.TextDisplay, content: '\u200b' },
    { type: ComponentType.TextDisplay, content: introText },
    buildSeparator()
  );

  if (pageData.entries.length === 0) {
    components.push({ type: ComponentType.TextDisplay, content: 'Нет данных для отображения.' });
  } else {
    pageData.entries.forEach((entry, index) => {
      components.push(buildEntryLine(section, entry, (pageData.page - 1) * PAGE_SIZE + index + 1));
      if (index < pageData.entries.length - 1) {
        components.push(buildSeparator());
      }
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('top', 'section', String(pageData.page)))
    .setPlaceholder('Выберите раздел')
    .addOptions(
      TOP_SECTIONS.map((value) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(SECTION_LABELS[value])
          .setValue(value)
          .setEmoji(formatEmoji(resolveSectionEmoji(value)))
          .setDefault(value === section)
      )
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const firstButton = new ButtonBuilder()
    .setCustomId(buildCustomId('top', 'page', 'first', section, '1'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('angledoublesmallleft'))
    .setDisabled(pageData.page <= 1);

  const prevButton = new ButtonBuilder()
    .setCustomId(buildCustomId('top', 'page', 'prev', section, String(Math.max(1, pageData.page - 1))))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallleft'))
    .setDisabled(pageData.page <= 1);

  const nextButton = new ButtonBuilder()
    .setCustomId(buildCustomId('top', 'page', 'next', section, String(Math.min(pageData.totalPages, pageData.page + 1))))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('anglesmallright'))
    .setDisabled(pageData.page >= pageData.totalPages);

  const lastButton = new ButtonBuilder()
    .setCustomId(buildCustomId('top', 'page', 'last', section, String(pageData.totalPages)))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(formatEmoji('angledoublesmallright'))
    .setDisabled(pageData.page >= pageData.totalPages);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    firstButton,
    prevButton,
    nextButton,
    lastButton
  );

  components.push(selectRow.toJSON(), buttonRow.toJSON());

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components
  };

  return [container];
}