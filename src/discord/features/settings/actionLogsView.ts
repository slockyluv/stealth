import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  channelMention,
  userMention,
  type Guild,
  type NonThreadGuildBasedChannel,
  type TopLevelComponentData
} from 'discord.js';
import { buildCustomId } from '../../../shared/customId.js';
import { createEmojiFormatter } from '../../emoji.js';
import { type ActionLogCategory, getActionLogSettings } from '../../../services/actionLogSettingsService.js';
import { MESSAGE_SEPARATOR_COMPONENT } from '../applications/config.js';
import { getGuildChannels } from '../../utils/guildFetch.js';

const CHANNEL_PAGE_SIZE = 10;

const CATEGORY_META: Record<
  ActionLogCategory,
  { label: string; emoji: string; description: string }
> = {
  moderation: {
    label: 'Модерирование',
    emoji: 'moder',
    description:
      '*Журнал различных действий модерации ( Блокировка пользователей, кик пользователей, муты пользователей, изменение nickname`ов ).*'
  },
  roles: {
    label: 'Управление ролями',
    emoji: 'random',
    description:
      '*Журнал выдачи, снятия ролей у пользователей как через команду, так и через встроенную возможность Discord.*'
  },
  messages: {
    label: 'Сообщения',
    emoji: 'message',
    description: '*Журнал действий с сообщениями ( Удаление, изменение сообщений ).*'
  },
  traffic: {
    label: 'Трафик',
    emoji: 'exit',
    description: '*Журнал посещения серверами пользователями Discord.*'
  },
  economy: {
    label: 'Экономика',
    emoji: 'sackdollar',
    description: '*Журнал действий с экономикой (выдача, списание, обнуление бюджета).*'
  }
};

function formatChannelDisplay(channelId: string | null, channels: Map<string, NonThreadGuildBasedChannel | null>): string {
  if (!channelId) return 'Не выбрано';

  const channel = channels.get(channelId) ?? null;
  if (channel?.isTextBased()) return channelMention(channel.id);
  return `<#${channelId}>`;
}

function formatAdmin(adminId: string | null): string {
  if (!adminId) return 'не выбрано';
  return userMention(adminId);
}

export type ActionLogsView = {
  components: TopLevelComponentData[];
};

export async function buildActionLogsOverview(guild: Guild): Promise<ActionLogsView> {
  const [settings, emoji] = await Promise.all([
    getActionLogSettings(guild.id),
    createEmojiFormatter({ client: guild.client, guildId: guild.id, guildEmojis: guild.emojis.cache.values() })
  ]);

  const fetchedChannels = await getGuildChannels(guild);
  const channelMap = new Map<string, NonThreadGuildBasedChannel | null>();
  for (const channel of fetchedChannels.values()) {
    if (!channel || channel.isThread()) continue;
    channelMap.set(channel.id, channel);
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('actionLogs', 'section'))
    .setPlaceholder('Выберите категорию журнала');

  for (const [category, meta] of Object.entries(CATEGORY_META) as [ActionLogCategory, typeof CATEGORY_META[keyof typeof CATEGORY_META]][]) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setValue(category)
        .setLabel(meta.label)
        .setEmoji(emoji(meta.emoji))
    );
  }

  const framed: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [
          `# ${emoji('action_book')} Журнал действий`,
          '*Выберите каналы для журнала различных действий пользователей и администраторов.*'
        ].join('\n')
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: `**Модерирование:** *${formatChannelDisplay(settings.moderationChannelId, channelMap)}*`
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: `**Управление ролями:** *${formatChannelDisplay(settings.rolesChannelId, channelMap)}*`
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: `**Сообщения:** *${formatChannelDisplay(settings.messagesChannelId, channelMap)}*`
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: `**Трафик:** *${formatChannelDisplay(settings.trafficChannelId, channelMap)}*`
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: `**Экономика:** *${formatChannelDisplay(settings.economyChannelId, channelMap)}*`
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select).toJSON()
    ]
  };

  return { components: [framed] };
}

function paginateChannels(channels: NonThreadGuildBasedChannel[]): NonThreadGuildBasedChannel[][] {
  const pages: NonThreadGuildBasedChannel[][] = [];
  for (let i = 0; i < channels.length; i += CHANNEL_PAGE_SIZE) {
    pages.push(channels.slice(i, i + CHANNEL_PAGE_SIZE));
  }
  return pages.length > 0 ? pages : [[]];
}

export async function buildActionLogCategoryView(options: {
  guild: Guild;
  category: ActionLogCategory;
  page?: number;
}): Promise<ActionLogsView & { currentPage: number; totalPages: number }> {
  const { guild, category } = options;
  const requestedPage = options.page ?? 1;

  const [settings, emoji] = await Promise.all([
    getActionLogSettings(guild.id),
    createEmojiFormatter({ client: guild.client, guildId: guild.id, guildEmojis: guild.emojis.cache.values() })
  ]);

  const fetchedChannels = await getGuildChannels(guild);

  const eligible: NonThreadGuildBasedChannel[] = [];
  for (const channel of fetchedChannels.values()) {
    if (!channel || channel.isThread()) continue;
    if (!(channel.type === ChannelType.GuildText || channel.isTextBased())) continue;
    if (!channel.viewable) continue;
    eligible.push(channel);
  }

  const pages = paginateChannels(eligible);
  const totalPages = pages.length;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const pageItems = pages[currentPage - 1] ?? [];

  const meta = CATEGORY_META[category];
  if (!meta) throw new Error('UNKNOWN_CATEGORY');

  const select = new StringSelectMenuBuilder()
    .setCustomId(buildCustomId('actionLogs', 'channel', category, String(currentPage)))
    .setPlaceholder(`Страница ${currentPage} из ${totalPages}`)
    .setMinValues(0)
    .setMaxValues(1);

  if (pageItems.length === 0) {
    select.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Нет доступных каналов')
        .setValue('none')
        .setDescription('У бота нет доступа к каналам')
    );
    select.setDisabled(true);
  } else {
    for (const channel of pageItems) {
      select.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(channel.name)
          .setValue(channel.id)
          .setDefault(settings[`${category}ChannelId` as const] === channel.id)
      );
    }
  }

  const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('actionLogs', 'page', category, 'first', '1'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(emoji('angledoublesmallleft'))
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('actionLogs', 'page', category, 'prev', String(Math.max(1, currentPage - 1))))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(emoji('anglesmallleft'))
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(buildCustomId('actionLogs', 'page', category, 'next', String(Math.min(totalPages, currentPage + 1))))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(emoji('anglesmallright'))
      .setDisabled(currentPage >= totalPages),
    new ButtonBuilder()
      .setCustomId(buildCustomId('actionLogs', 'page', category, 'last', String(totalPages)))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(emoji('angledoublesmallright'))
      .setDisabled(currentPage >= totalPages)
  );

  const overviewButton = new ButtonBuilder()
    .setCustomId(buildCustomId('actionLogs', 'home'))
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(emoji('undonew'));

  const adminId = settings[`${category}UpdatedBy` as const];
  const channelId = settings[`${category}ChannelId` as const];

  const framed: TopLevelComponentData = {
    type: ComponentType.Container,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: [`# ${emoji(meta.emoji)} ${meta.label}`, meta.description].join('\n')
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      {
        type: ComponentType.TextDisplay,
        content: [
          `**Выбранный канал:** ${channelId ? channelMention(channelId) : 'не выбрано'}`,
          `**Администратор:** ${formatAdmin(adminId)}`
        ].join('\n')
      },
      { ...MESSAGE_SEPARATOR_COMPONENT },
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select).toJSON(),
      navRow.toJSON(),
      new ActionRowBuilder<ButtonBuilder>().addComponents(overviewButton).toJSON()
    ]
  };

  return { components: [framed], currentPage, totalPages };
}