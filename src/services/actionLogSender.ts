import { MessageFlags, type Guild, ComponentType, type TopLevelComponentData } from 'discord.js';
import { getActionLogSettings, type ActionLogCategory } from './actionLogSettingsService.js';
import { logger } from '../shared/logger.js';
import { getSendableChannelById } from '../discord/utils/guildFetch.js';

async function resolveChannel(guild: Guild, channelId: string | null) {
  return getSendableChannelById(guild, channelId);
}

export async function sendActionLog(options: {
  guild: Guild;
  category: ActionLogCategory;
  components: TopLevelComponentData[];
}) {
  const { guild, category, components } = options;

  const settings = await getActionLogSettings(guild.id);
  const channelId = settings[`${category}ChannelId` as const];

  const channel = await resolveChannel(guild, channelId);
  if (!channel) return;

  try {
    await channel.send({
      components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    });
  } catch (error) {
    logger.error(error);
  }
}

export function buildBaseContainer(lines: string[]): TopLevelComponentData[] {
  return [
    {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: lines.shift() ?? ''
        },
        { type: ComponentType.Separator, divider: true },
        ...lines.map((content) => ({ type: ComponentType.TextDisplay, content }))
      ]
    }
  ];
}