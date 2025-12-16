import { prisma } from '../database/prisma.js';
function toBigInt(id) {
    return BigInt(id);
}
function mapIdsFromBigInt(rows) {
    return rows.map((row) => row.roleId.toString());
}
export async function getAutoRoles(guildId) {
    const rows = await prisma.autoRole.findMany({
        where: { guildId: toBigInt(guildId) },
        orderBy: { createdAt: 'asc' }
    });
    return mapIdsFromBigInt(rows);
}
export async function setAutoRoles(guildId, roleIds) {
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