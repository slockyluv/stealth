import type { ApplicationEmoji, Client } from 'discord.js';
import { getEmojiColor } from '../services/guildSettingsService.js';
import { logger } from '../shared/logger.js';

type EmojiLike = Pick<ApplicationEmoji, 'name' | 'toString'>;

function buildEmojiMap(emojis: Iterable<EmojiLike>) {
  const map = new Map<string, EmojiLike>();
  for (const emoji of emojis) {
    if (emoji.name) {
      map.set(emoji.name, emoji);
      map.set(emoji.name.toLowerCase(), emoji);
    }
  }
  return map;
}

function buildEmojiVariants(emojis: Iterable<EmojiLike>) {
  const variants = new Map<string, Map<string, EmojiLike>>();
  const pattern = /^(.+?)[_-]([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

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
  guildEmojis?: Iterable<EmojiLike>;
}): Promise<(name: string) => string> {
  const { client, guildId, guildEmojis } = options;
  const color = await getEmojiColor(guildId);
  const colorKey = color?.toLowerCase() ?? null;
  const colorCandidates: string[] = [];

  if (colorKey) {
    colorCandidates.push(colorKey);
    if (colorKey.length === 8) colorCandidates.push(colorKey.slice(2));
    if (colorKey.length === 6) colorCandidates.push(`ff${colorKey}`);
  }

  let emojiMap = new Map<string, EmojiLike>();
  let emojiVariants = new Map<string, Map<string, EmojiLike>>();

  try {
    const emojiValues: EmojiLike[] = [];

    if (client.application) {
      await client.application.fetch();
      const emojis = await client.application.emojis.fetch();
      emojiValues.push(...emojis.values());
    }

    if (guildEmojis) {
      emojiValues.push(...guildEmojis);
    }

    emojiMap = buildEmojiMap(emojiValues);
    emojiVariants = buildEmojiVariants(emojiValues);
  } catch (error) {
    logger.error(error);
  }

  return (name: string) => {
    const baseKey = name.toLowerCase();

    if (colorCandidates.length > 0) {
      const variantsForBase = emojiVariants.get(baseKey);
      for (const candidate of colorCandidates) {
        const variant = variantsForBase?.get(candidate);
        if (variant) return variant.toString();

        const direct =
          emojiMap.get(`${baseKey}_${candidate}`) ??
          emojiMap.get(`${baseKey}-${candidate}`) ??
          emojiMap.get(`${baseKey}${candidate}`);
        if (direct) return direct.toString();
      }
    }

    const base = emojiMap.get(baseKey) ?? emojiMap.get(name);
    if (base) return base.toString();

    return `:${name}:`;
  };
}