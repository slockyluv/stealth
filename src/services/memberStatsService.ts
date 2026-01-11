import { prisma } from '../database/prisma.js';

export type MemberStatsPoint = {
  date: Date;
  memberCount: number;
  joins: number;
  leaves: number;
};

export type MemberStatsSummary = {
  points: MemberStatsPoint[];
  totalJoins: number;
  totalLeaves: number;
  minMembers: number;
  maxMembers: number;
};

type GuildMemberDailyStatRow = {
  date: Date;
  memberCount: number;
  joins: number;
  leaves: number;
};

type GuildMemberDailyStatDelegate = {
  upsert: (args: {
    where: { guildId_date: { guildId: bigint; date: Date } };
    update: { joins: { increment: number }; leaves: { increment: number }; memberCount: number };
    create: { guildId: bigint; date: Date; joins: number; leaves: number; memberCount: number };
  }) => Promise<GuildMemberDailyStatRow>;
  findMany: (args: {
    where: { guildId: bigint; date: { gte: Date; lte: Date } };
    orderBy: { date: 'asc' | 'desc' };
  }) => Promise<GuildMemberDailyStatRow[]>;
};

const DEFAULT_DAYS = 14;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function upsertDailyStat(options: {
  guildId: string;
  date: Date;
  memberCount: number;
  joinsDelta?: number;
  leavesDelta?: number;
}) {
  const { guildId, date, memberCount, joinsDelta = 0, leavesDelta = 0 } = options;
  const guildIdBig = BigInt(guildId);
  const { guildMemberDailyStat } = prisma as unknown as {
    guildMemberDailyStat: GuildMemberDailyStatDelegate;
  };

  await guildMemberDailyStat.upsert({
    where: { guildId_date: { guildId: guildIdBig, date } },
    update: {
      joins: { increment: joinsDelta },
      leaves: { increment: leavesDelta },
      memberCount
    },
    create: {
      guildId: guildIdBig,
      date,
      joins: joinsDelta,
      leaves: leavesDelta,
      memberCount
    }
  });
}

export async function recordMemberJoin(options: { guildId: string; memberCount: number; joinedAt?: Date }) {
  const { guildId, memberCount, joinedAt = new Date() } = options;
  const date = startOfUtcDay(joinedAt);
  await upsertDailyStat({ guildId, date, memberCount, joinsDelta: 1 });
}

export async function recordMemberLeave(options: { guildId: string; memberCount: number; leftAt?: Date }) {
  const { guildId, memberCount, leftAt = new Date() } = options;
  const date = startOfUtcDay(leftAt);
  await upsertDailyStat({ guildId, date, memberCount, leavesDelta: 1 });
}

export async function getMemberStatsSummary(options: {
  guildId: string;
  currentMemberCount: number;
  days?: number;
  now?: Date;
}): Promise<MemberStatsSummary> {
  const { guildId, currentMemberCount, days = DEFAULT_DAYS, now = new Date() } = options;
  const guildIdBig = BigInt(guildId);
  const totalDays = Math.max(1, days);
  const endDate = startOfUtcDay(now);
  const startDate = addUtcDays(endDate, -(totalDays - 1));
  const { guildMemberDailyStat } = prisma as unknown as {
    guildMemberDailyStat: GuildMemberDailyStatDelegate;
  };

  const rows = await guildMemberDailyStat.findMany({
    where: {
      guildId: guildIdBig,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { date: 'asc' }
  });

  const rowMap = new Map<string, (typeof rows)[number]>();
  rows.forEach((row) => rowMap.set(dateKey(row.date), row));

  let lastKnownCount = currentMemberCount;
  const points: MemberStatsPoint[] = [];

  for (let i = 0; i < totalDays; i += 1) {
    const date = addUtcDays(startDate, i);
    const key = dateKey(date);
    const row = rowMap.get(key) ?? null;

    if (row) {
      lastKnownCount = row.memberCount;
    }

    points.push({
      date,
      memberCount: row ? row.memberCount : lastKnownCount,
      joins: row ? row.joins : 0,
      leaves: row ? row.leaves : 0
    });
  }

  const memberCounts = points.map((point) => point.memberCount);
  const minMembers = memberCounts.length > 0 ? Math.min(...memberCounts) : currentMemberCount;
  const maxMembers = memberCounts.length > 0 ? Math.max(...memberCounts) : currentMemberCount;
  const totalJoins = points.reduce((sum, point) => sum + point.joins, 0);
  const totalLeaves = points.reduce((sum, point) => sum + point.leaves, 0);

  return {
    points,
    totalJoins,
    totalLeaves,
    minMembers,
    maxMembers
  };
}