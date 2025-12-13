import { logger } from '../../shared/logger.js';
export function ready(client) {
    if (!client.user)
        return;
    logger.info(`Logged in as ${client.user.tag}`);
}
//# sourceMappingURL=ready.js.map