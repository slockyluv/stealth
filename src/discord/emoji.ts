import type { ApplicationEmoji, Client } from 'discord.js';
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

const APPLICATION_EMOJI_TTL = 10 * 60 * 1000;
let cachedApplicationEmojis: EmojiLike[] = [];
let cachedAt = 0;
let inFlightFetch: Promise<void> | null = null;

const FORMATTER_TTL = 10 * 60 * 1000;
const formatterCache = new Map<
  string,
  { formatter: (name: string) => string; cachedAt: number }
>();

async function loadApplicationEmojis(client: Client): Promise<EmojiLike[]> {
  const application = client.application;
  if (!application) return [];

  const now = Date.now();
  if (cachedApplicationEmojis.length > 0 && now - cachedAt < APPLICATION_EMOJI_TTL) {
    return cachedApplicationEmojis;
  }

  if (inFlightFetch) {
    await inFlightFetch;
    return cachedApplicationEmojis;
  }

  inFlightFetch = (async () => {
    try {
      await application.fetch();
      const emojis = await application.emojis.fetch();
      cachedApplicationEmojis = Array.from(emojis.values());
      cachedAt = Date.now();
    } catch (error) {
      logger.error(error);
    } finally {
      inFlightFetch = null;
    }
  })();

  await inFlightFetch;
  return cachedApplicationEmojis;
}

export async function createEmojiFormatter(options: {
  client: Client;
  guildId: string;
  guildEmojis?: Iterable<EmojiLike>;
}): Promise<(name: string) => string> {
  const { client, guildEmojis, guildId } = options;
  const now = Date.now();
  const cachedFormatter = formatterCache.get(guildId);
  if (cachedFormatter && now - cachedFormatter.cachedAt < FORMATTER_TTL) {
    return cachedFormatter.formatter;
  }

  let emojiMap = new Map<string, EmojiLike>();

  try {
    const emojiValues: EmojiLike[] = [];

    const applicationEmojis = await loadApplicationEmojis(client);
    emojiValues.push(...applicationEmojis);

    if (guildEmojis) {
      emojiValues.push(...guildEmojis);
    }

    emojiMap = buildEmojiMap(emojiValues);
  } catch (error) {
    logger.error(error);
  }

  const formatter = (name: string) => {
    const baseKey = name.toLowerCase();

    const base = emojiMap.get(baseKey) ?? emojiMap.get(name);
    if (base) return base.toString();

    return `:${name}:`;
  };

  formatterCache.set(guildId, { formatter, cachedAt: now });

  return formatter;
}