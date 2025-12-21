import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  MessageFlags,
  type Message,
  ComponentType,
  type ContainerComponentData,
  type ComponentInContainerData,
  type MediaGalleryComponentData,
  type SectionComponentData,
  type SeparatorComponentData,
  type TextDisplayComponentData,
  type ThumbnailComponentData,
  type TopLevelComponentData,
  GuildVerificationLevel,
  type Guild
} from 'discord.js';
import { logger } from '../../shared/logger.js';
import type { Command } from '../../types/command.js';
import { createEmojiFormatter } from '../emoji.js';
import { buildTextView } from '../components/v2Message.js';
import { buildCustomId } from '../../shared/customId.js';

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

export type ServerViewTab = 'server' | 'members' | 'channels';

type ServerStats = {
  totalMembers: number;
  botCount: number;
  humanCount: number;
  online: number;
  idle: number;
  dnd: number;
  offline: number;
  totalChannels: number;
  textChannels: number;
  forumChannels: number;
  voiceChannels: number;
  stageChannels: number;
};

function formatVerificationLevel(level: GuildVerificationLevel): string {
  switch (level) {
    case GuildVerificationLevel.Low:
      return 'Низкий';
    case GuildVerificationLevel.Medium:
      return 'Средний';
    case GuildVerificationLevel.High:
      return 'Высокий';
    case GuildVerificationLevel.VeryHigh:
      return 'Очень высокий';
    case GuildVerificationLevel.None:
    default:
      return 'Отсутствует';
  }
}

function buildSeparator(): SeparatorComponentData {
  return {
    type: ComponentType.Separator,
    divider: true
  };
}

function buildLineComponents(
  lines: string[]
): Array<TextDisplayComponentData | SeparatorComponentData> {
  const components: Array<TextDisplayComponentData | SeparatorComponentData> = [];

  lines.forEach((line, index) => {
    components.push({ type: ComponentType.TextDisplay, content: line });
    if (index < lines.length - 1) {
      components.push(buildSeparator());
    }
  });

  return components;
}

async function fetchServerStats(guild: Guild): Promise<ServerStats> {
  const [channels] = await Promise.all([guild.channels.fetch()]);

  const validChannels = channels.filter((channel): channel is NonNullable<typeof channel> => channel !== null);

  const totalMembers = guild.memberCount;
  const cachedMembers = guild.members.cache;
  const botCount = cachedMembers.filter((member) => member.user.bot).size;
  const humanCount = Math.max(totalMembers - botCount, 0);

  let online = 0;
  let idle = 0;
  let dnd = 0;

  for (const presence of guild.presences.cache.values()) {
    const status = presence.status ?? 'offline';
    if (status === 'online') online += 1;
    else if (status === 'idle') idle += 1;
    else if (status === 'dnd') dnd += 1;
  }

  const offline = Math.max(totalMembers - online - idle - dnd, 0);

  const textChannels = validChannels.filter(
    (channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement
  ).size;

  const forumChannels = validChannels.filter((channel) => channel.type === ChannelType.GuildForum).size;

  const voiceChannels = validChannels.filter((channel) => channel.type === ChannelType.GuildVoice).size;

  const stageChannels = validChannels.filter((channel) => channel.type === ChannelType.GuildStageVoice).size;

  const totalChannels = textChannels + forumChannels + voiceChannels + stageChannels;

  return {
    totalMembers,
    botCount,
    humanCount,
    online,
    idle,
    dnd,
    offline,
    totalChannels,
    textChannels,
    forumChannels,
    voiceChannels,
    stageChannels
  };
}

function buildHeaderSection(
  guild: Guild,
  iconUrl: string | null,
  formatEmoji: (name: string) => string
): SectionComponentData | TextDisplayComponentData {
  const headerLines = [
    `**${formatEmoji('information')} Информация о сервере < ${guild.name} >**`,
    `**ID сервера:** \`${guild.id}\``
  ];

  if (!iconUrl) {
    return {
      type: ComponentType.TextDisplay,
      content: headerLines.join('\n')
    };
  }

  const thumbnail: ThumbnailComponentData = {
    type: ComponentType.Thumbnail,
    media: { url: iconUrl },
    description: 'Аватар сервера'
  };

  return {
    type: ComponentType.Section,
    components: [
      {
        type: ComponentType.TextDisplay,
        content: headerLines.join('\n')
      }
    ],
    accessory: thumbnail
  };
}

function buildTabButtons(tab: ServerViewTab): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildCustomId('server', 'tab', 'server'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Сервер')
      .setDisabled(tab === 'server'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('server', 'tab', 'members'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Участники')
      .setDisabled(tab === 'members'),
    new ButtonBuilder()
      .setCustomId(buildCustomId('server', 'tab', 'channels'))
      .setStyle(ButtonStyle.Secondary)
      .setLabel('Каналы')
      .setDisabled(tab === 'channels')
  );
}

export async function buildServerView(options: {
  guild: Guild;
  tab: ServerViewTab;
}): Promise<TopLevelComponentData[]> {
  const { guild, tab } = options;

  const [emojis, owner, stats] = await Promise.all([
    guild.emojis.fetch(),
    guild.fetchOwner().catch(() => null),
    fetchServerStats(guild)
  ]);

  const emoji = await createEmojiFormatter({
    client: guild.client,
    guildId: guild.id,
    guildEmojis: emojis.values()
  });

  const ownerUser = owner?.user ?? guild.members.cache.get(guild.ownerId)?.user;
  const ownerUsername = ownerUser?.username ?? 'Неизвестно';

  const iconUrl = guild.iconURL({ size: 256 });
  const containerComponents: ComponentInContainerData[] = [
    buildHeaderSection(guild, iconUrl, emoji),
    buildTabButtons(tab).toJSON(),
    buildSeparator()
  ];

  if (tab === 'server') {
    const serverLines = [
      `**${emoji('owner')} Владелец:**`,
      ownerUsername,
      `ID \`${guild.ownerId}\``,
      '',
      `**${emoji('otpechatok')} Уровень проверки**`,
      formatVerificationLevel(guild.verificationLevel),
      '',
      `**${emoji('date')} Дата создания**`,
      `\`${formatFullDateTime(guild.createdAt)}\``
    ];

    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: serverLines.join('\n')
    });
  }

  if (tab === 'members') {
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `**${emoji('family')} Участники:**`
    });

    containerComponents.push(
      ...buildLineComponents([
        `${emoji('private2')} Всего: \`${numberFormatter.format(stats.totalMembers)}\``,
        `${emoji('user')} Люди: \`${numberFormatter.format(stats.humanCount)}\``,
        `${emoji('bots')} Боты: \`${numberFormatter.format(stats.botCount)}\``
      ])
    );

    containerComponents.push({ type: ComponentType.TextDisplay, content: '\u200B' });
    containerComponents.push({
      type: ComponentType.TextDisplay,
      content: `**${emoji('star')} Статусы пользователей:**`
    });

    containerComponents.push(
      ...buildLineComponents([
        `${emoji('online')} В сети: \`${numberFormatter.format(stats.online)}\``,
        `${emoji('noactive')} Неактивны: \`${numberFormatter.format(stats.idle)}\``,
        `${emoji('disturb')} Не беспокоить: \`${numberFormatter.format(stats.dnd)}\``,
        `${emoji('offline')} Не в сети: \`${numberFormatter.format(stats.offline)}\``
      ])
    );
  }

  if (tab === 'channels') {
    containerComponents.push(
      ...buildLineComponents([
        `${emoji('message')} Всего: \`${numberFormatter.format(stats.totalChannels)}\``,
        `${emoji('channel')} Текстовых: \`${numberFormatter.format(stats.textChannels)}\``,
        `${emoji('more')} Форумов: \`${numberFormatter.format(stats.forumChannels)}\``,
        `${emoji('voice_chat')} Голосовых: \`${numberFormatter.format(stats.voiceChannels)}\``,
        `${emoji('dnd')} Трибун: \`${numberFormatter.format(stats.stageChannels)}\``
      ])
    );
  }

  const bannerUrl = guild.bannerURL({ size: 1024 });
  if (bannerUrl) {
    const bannerGallery: MediaGalleryComponentData = {
      type: ComponentType.MediaGallery,
      items: [
        {
          media: { url: bannerUrl }
        }
      ]
    };
    containerComponents.push(bannerGallery);
  }

  const container: ContainerComponentData = {
    type: ComponentType.Container,
    components: containerComponents
  };

  return [container];
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
      const components = await buildServerView({
        guild: interaction.guild,
        tab: 'server'
      });
      await interaction.editReply({
        components,
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
  },

  async executeMessage(message: Message) {
    if (!message.guild) {
      if (!message.channel?.isSendable()) return;
      await message.channel.send({
        components: buildTextView('Эта команда доступна только на сервере.'),
        flags: MessageFlags.IsComponentsV2
      });
      return;
    }

    if (!message.channel?.isSendable()) return;
    const pendingReply = await message.channel.send({
      components: buildTextView('Собираю информацию о сервере...'),
      flags: MessageFlags.IsComponentsV2
    });

    try {
      const components = await buildServerView({
        guild: message.guild,
        tab: 'server'
      });
      await pendingReply.edit({
        components,
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      logger.error(error);

      await pendingReply.edit({
        components: buildTextView('Не удалось получить информацию о сервере. Попробуйте позже.'),
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};