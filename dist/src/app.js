import { loadEnv } from './config/env.js';
import { prisma } from './database/prisma.js';
import { createClient } from './discord/client.js';
import { registerEvents } from './discord/events/index.js';
import { logger } from './shared/logger.js';
loadEnv();
async function bootstrap() {
    await prisma.$connect();
    logger.info('Prisma connected');
    const client = createClient();
    registerEvents(client);
    await client.login(process.env.BOT_TOKEN);
    logger.info('stealth is ready');
}
bootstrap().catch((err) => {
    logger.error(err);
    process.exit(1);
});
//# sourceMappingURL=app.js.map