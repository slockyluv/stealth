import { prisma } from '../database/prisma.js';
import { logger } from '../shared/logger.js';
export async function upsertUser(discordUserId) {
    const id = BigInt(discordUserId);
    const user = await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id }
    });
    logger.info(`User upserted: ${discordUserId}`);
    return user;
}
//# sourceMappingURL=userService.js.map