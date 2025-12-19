import type { ApplicationEmoji, Client } from 'discord.js';
import { getEmojiColor } from '../services/guildSettingsService.js';
import { logger } from '../shared/logger.js';

function buildEmojiMap(emojis: Iterable<ApplicationEmoji>) {
  const map = new Map<string, ApplicationEmoji>();
  for (const emoji of emojis) {
    if (emoji.name) {
      map.set(emoji.name, emoji);
      map.set(emoji.name.toLowerCase(), emoji);
    }
  }
  return map;
}

function buildEmojiVariants(emojis: Iterable<ApplicationEmoji>) {
  const variants = new Map<string, Map<string, ApplicationEmoji>>();
  const pattern = /^(.+?)[_-]([0-9a-fA-F]{6})$/;

  for (const emoji of emojis) {
    if (!emoji.name) continue;
    const match = emoji.name.match(pattern);
    if (!match) continue;

    const baseMatch = match[1];
    const hexMatch = match[2];
    if (!baseMatch || !hexMatch) continue;

    const base = baseMatch.toLowerCase();
    const hex = hexMatch.toLowerCase();
    const byHex = variants.get(base) ?? new Map<string, ApplicationEmoji>();
    byHex.set(hex, emoji);
    variants.set(base, byHex);
  }

  return variants;
}

export async function createEmojiFormatter(options: {
  client: Client;
  guildId: string;
}): Promise<(name: string) => string> {
  const { client, guildId } = options;
  const color = await getEmojiColor(guildId);
  const colorKey = color?.toLowerCase() ?? null;

  let emojiMap = new Map<string, ApplicationEmoji>();
  let emojiVariants = new Map<string, Map<string, ApplicationEmoji>>();

  try {
    if (client.application) {
      const emojis = await client.application.emojis.fetch();
      const emojiValues = Array.from(emojis.values());
      emojiMap = buildEmojiMap(emojiValues);
      emojiVariants = buildEmojiVariants(emojiValues);
    }
  } catch (error) {
    logger.error(error);
  }

  return (name: string) => {
    const baseKey = name.toLowerCase();

    if (colorKey) {
      const variantsForBase = emojiVariants.get(baseKey);
      const variant = variantsForBase?.get(colorKey);
      if (variant) return variant.toString();

      const direct =
        emojiMap.get(`${baseKey}_${colorKey}`) ??
        emojiMap.get(`${baseKey}-${colorKey}`) ??
        emojiMap.get(`${baseKey}${colorKey}`);
      if (direct) return direct.toString();
    }

    const base = emojiMap.get(baseKey) ?? emojiMap.get(name);
    if (base) return base.toString();

    return `:${name}:`;
  };
}