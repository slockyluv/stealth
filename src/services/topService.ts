import { prisma } from '../database/prisma.js';
import { getXpToNextLevel } from './levelService.js';

export type TopSection = 'levels' | 'messages' | 'voice' | 'streak';

export type TopEntry = {
  userId: string;
  level: number;
  xp: number;
  xpToNext: number;
  totalMessageCount: number;
  totalVoiceMinutes: number;
  maxStreakDays: number;
};

export type TopPage = {
  entries: TopEntry[];
  page: number;
  totalPages: number;
  totalCount: number;
};

function resolveOrderBy(section: TopSection) {
  if (section === 'messages') return [{ totalMessageCount: 'desc' } as const];
  if (section === 'voice') return [{ totalVoiceMinutes: 'desc' } as const];
  if (section === 'streak') return [{ maxStreakDays: 'desc' } as const];
  return [{ level: 'desc' } as const, { xp: 'desc' } as const];
}

export async function getTopPage(options: {
  guildId: string;
  section: TopSection;
  page: number;
  pageSize?: number;
}): Promise<TopPage> {
  const { guildId, section, page, pageSize = 10 } = options;
  const guildIdBig = BigInt(guildId);

  const { totalCount, totalPages, safePage, records } =
    await prisma.$transaction(async (transaction) => {
      const totalCount = await transaction.guildUserLevel.count({
        where: { guildId: guildIdBig }
      });

      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);

      const records = await transaction.guildUserLevel.findMany({
        where: { guildId: guildIdBig },
        orderBy: resolveOrderBy(section),
        skip: (safePage - 1) * pageSize,
        take: pageSize,
        select: {
          userId: true,
          level: true,
          xp: true,
          totalMessageCount: true,
          totalVoiceMinutes: true,
          maxStreakDays: true
        }
      });

      return {
        totalCount,
        totalPages,
        safePage,
        records
      };
    });

  const entries = records.map((record) => ({
    userId: record.userId.toString(),
    level: record.level,
    xp: Number(record.xp),
    xpToNext: getXpToNextLevel(record.level),
    totalMessageCount: record.totalMessageCount,
    totalVoiceMinutes: record.totalVoiceMinutes,
    maxStreakDays: record.maxStreakDays
  }));

  return {
    entries,
    page: safePage,
    totalPages,
    totalCount
  };
}