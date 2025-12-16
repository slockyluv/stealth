import { prisma } from '../database/prisma.js';

let ensureSchemaPromise: Promise<void> | null = null;

async function ensureSchema() {
  if (ensureSchemaPromise) return ensureSchemaPromise;

  ensureSchemaPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AutoRole" (
        "id" BIGSERIAL PRIMARY KEY,
        "guildId" BIGINT NOT NULL,
        "roleId" BIGINT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS "AutoRole_guildId_roleId_key" ON "AutoRole"("guildId", "roleId");'
    );

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "AutoRole_guildId_idx" ON "AutoRole"("guildId");'
    );
  })();

  try {
    await ensureSchemaPromise;
  } catch (error) {
    ensureSchemaPromise = null;
    throw error;
  }
}

function toBigInt(id: string): bigint {
  return BigInt(id);
}

function mapIdsFromBigInt(rows: { roleId: bigint }[]): string[] {
  return rows.map((row) => row.roleId.toString());
}

export async function getAutoRoles(guildId: string): Promise<string[]> {
  await ensureSchema();

  const rows = await prisma.autoRole.findMany({
    where: { guildId: toBigInt(guildId) },
    orderBy: { createdAt: 'asc' }
  });

  return mapIdsFromBigInt(rows);
}

export async function setAutoRoles(guildId: string, roleIds: string[]): Promise<string[]> {
  await ensureSchema();

  const guild = toBigInt(guildId);
  const uniqueRoleIds = Array.from(new Set(roleIds)).map(toBigInt);

  await prisma.$transaction(async (tx) => {
    await tx.autoRole.deleteMany({ where: { guildId: guild } });

    if (uniqueRoleIds.length === 0) return;

    await tx.autoRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({ guildId: guild, roleId }))
    });
  });

  return getAutoRoles(guildId);
}