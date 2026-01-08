import { prisma } from '../database/prisma.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export type MarriageInfo = {
  partnerId: string;
  startedAt: Date;
  daysTogether: number;
  hoursTogether: number;
};

function calculateDuration(startedAt: Date, now = new Date()) {
  const diffMs = Math.max(0, now.getTime() - startedAt.getTime());
  const daysTogether = Math.floor(diffMs / MS_PER_DAY);
  const hoursTogether = Math.floor(diffMs / MS_PER_HOUR);

  return { daysTogether, hoursTogether };
}

export async function getMarriageForUser(guildId: string, userId: string): Promise<MarriageInfo | null> {
  const guildIdBig = BigInt(guildId);
  const userIdBig = BigInt(userId);

  const marriage = await prisma.marriage.findFirst({
    where: {
      guildId: guildIdBig,
      OR: [{ userIdA: userIdBig }, { userIdB: userIdBig }]
    }
  });

  if (!marriage) return null;

  const partnerId = marriage.userIdA === userIdBig ? marriage.userIdB : marriage.userIdA;
  const { daysTogether, hoursTogether } = calculateDuration(marriage.startedAt);

  if (marriage.daysTogether !== daysTogether) {
    await prisma.marriage.update({
      where: { id: marriage.id },
      data: { daysTogether }
    });
  }

  return {
    partnerId: partnerId.toString(),
    startedAt: marriage.startedAt,
    daysTogether,
    hoursTogether
  };
}

export async function createMarriage(options: {
  guildId: string;
  proposerId: string;
  targetId: string;
}): Promise<{ status: 'created' } | { status: 'conflict'; conflictUserId: string }> {
  const guildIdBig = BigInt(options.guildId);
  const proposerIdBig = BigInt(options.proposerId);
  const targetIdBig = BigInt(options.targetId);

  const [userIdA, userIdB] = proposerIdBig < targetIdBig ? [proposerIdBig, targetIdBig] : [targetIdBig, proposerIdBig];

  return prisma.$transaction(async (tx) => {
    const existing = await tx.marriage.findFirst({
      where: {
        guildId: guildIdBig,
        OR: [
          { userIdA: proposerIdBig },
          { userIdB: proposerIdBig },
          { userIdA: targetIdBig },
          { userIdB: targetIdBig }
        ]
      }
    });

    if (existing) {
      const proposerInvolved = existing.userIdA === proposerIdBig || existing.userIdB === proposerIdBig;
      return { status: 'conflict', conflictUserId: proposerInvolved ? options.proposerId : options.targetId };
    }

    await tx.marriage.create({
      data: {
        guildId: guildIdBig,
        userIdA,
        userIdB
      }
    });

    return { status: 'created' };
  });
}

export async function deleteMarriage(options: {
  guildId: string;
  userIdA: string;
  userIdB: string;
}): Promise<boolean> {
  const guildIdBig = BigInt(options.guildId);
  const userIdABig = BigInt(options.userIdA);
  const userIdBBig = BigInt(options.userIdB);
  const [userIdA, userIdB] = userIdABig < userIdBBig ? [userIdABig, userIdBBig] : [userIdBBig, userIdABig];

  const result = await prisma.marriage.deleteMany({
    where: {
      guildId: guildIdBig,
      userIdA,
      userIdB
    }
  });

  return result.count > 0;
}