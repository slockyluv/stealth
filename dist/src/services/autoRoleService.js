import { prisma } from '../database/prisma.js';
const AUTO_ROLE_TABLE_DDL = [
    `CREATE TABLE IF NOT EXISTS "AutoRole" (
    "id" BIGSERIAL PRIMARY KEY,
    "guildId" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "AutoRole_guildId_roleId_key" ON "AutoRole"("guildId", "roleId");',
    'CREATE INDEX IF NOT EXISTS "AutoRole_guildId_idx" ON "AutoRole"("guildId");'
];
let ensureAutoRoleTablePromise = null;
async function ensureAutoRoleTable() {
    if (!ensureAutoRoleTablePromise) {
        ensureAutoRoleTablePromise = (async () => {
            const [existing] = await prisma.$queryRaw `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'AutoRole'
        ) as "exists";
      `;
            if (!existing?.exists) {
                for (const statement of AUTO_ROLE_TABLE_DDL) {
                    await prisma.$executeRawUnsafe(statement);
                }
            }
        })().catch((error) => {
            ensureAutoRoleTablePromise = null;
            throw error;
        });
    }
    return ensureAutoRoleTablePromise;
}
function toBigInt(id) {
    return BigInt(id);
}
function mapIdsFromBigInt(rows) {
    return rows.map((row) => row.roleId.toString());
}
export async function getAutoRoles(guildId) {
    await ensureAutoRoleTable();
    const rows = await prisma.autoRole.findMany({
        where: { guildId: toBigInt(guildId) },
        orderBy: { createdAt: 'asc' }
    });
    return mapIdsFromBigInt(rows);
}
export async function setAutoRoles(guildId, roleIds) {
    await ensureAutoRoleTable();
    const guild = toBigInt(guildId);
    const uniqueRoleIds = Array.from(new Set(roleIds)).map(toBigInt);
    await prisma.$transaction(async (tx) => {
        await tx.autoRole.deleteMany({ where: { guildId: guild } });
        if (uniqueRoleIds.length === 0)
            return;
        await tx.autoRole.createMany({
            data: uniqueRoleIds.map((roleId) => ({ guildId: guild, roleId }))
        });
    });
    return getAutoRoles(guildId);
}
//# sourceMappingURL=autoRoleService.js.map