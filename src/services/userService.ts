import { prisma } from '../database/prisma.js';

const UPSERT_THROTTLE_MS = 5 * 60 * 1000;
const lastUpsertAt = new Map<string, number>();

export async function upsertUser(discordUserId: string) {
  const now = Date.now();
  const last = lastUpsertAt.get(discordUserId) ?? 0;
  if (now - last < UPSERT_THROTTLE_MS) {
    return null;
  }
  lastUpsertAt.set(discordUserId, now);

  const id = BigInt(discordUserId);

  const user = await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id }
  });

  return user;
}