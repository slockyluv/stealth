import { prisma } from '../database/prisma.js';

const UPSERT_THROTTLE_MS = 5 * 60 * 1000;
const MAX_LAST_UPSERT_ENTRIES = 10000;
const SWEEP_SCAN_LIMIT = 500;
const lastUpsertAt = new Map<string, number>();
let sweepIterator: IterableIterator<[string, number]> | null = null;

function sweepStaleUpserts(now: number) {
  if (lastUpsertAt.size <= MAX_LAST_UPSERT_ENTRIES) {
    sweepIterator = null;
    return;
  }

  if (!sweepIterator) {
    sweepIterator = lastUpsertAt.entries();
  }

  let scanned = 0;
  while (scanned < SWEEP_SCAN_LIMIT) {
    const next = sweepIterator.next();
    if (next.done) {
      sweepIterator = null;
      break;
    }
    scanned += 1;
    const [userId, timestamp] = next.value;
    if (now - timestamp > UPSERT_THROTTLE_MS) {
      lastUpsertAt.delete(userId);
    }
  }
}

export async function upsertUser(discordUserId: string) {
  const now = Date.now();
  sweepStaleUpserts(now);
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