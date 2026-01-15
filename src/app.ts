import { loadEnv } from './config/env.js';
import { prisma } from './database/prisma.js';
import { createClient } from './discord/client.js';
import { registerEvents } from './discord/events/index.js';
import { logger } from './shared/logger.js';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { registerCanvasFonts } from './render/registerCanvasFonts.js';

loadEnv();

let client: ReturnType<typeof createClient> | null = null;
let shuttingDown = false;

function startEventLoopMonitor() {
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();

  const interval = setInterval(() => {
    const meanMs = histogram.mean / 1e6;
    const maxMs = histogram.max / 1e6;

    if (meanMs > 200 || maxMs > 1000) {
      logger.info(`Event loop delay: mean=${meanMs.toFixed(2)}ms max=${maxMs.toFixed(2)}ms`);
    }

    histogram.reset();
  }, 10_000);

  interval.unref();
}

async function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Shutdown initiated: ${reason}`);

  try {
    if (client) {
      await client.destroy();
    }
  } catch (error) {
    logger.error(error);
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error(error);
  }

  process.exit(exitCode);
}

function registerShutdownHooks() {
  const handleSignal = (signal: string) => {
    void shutdown(signal);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logger.error(error);
    void shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(reason);
    void shutdown('unhandledRejection', 1);
  });
}

async function bootstrap() {
  await prisma.$connect();
  logger.info('Prisma connected');

  registerCanvasFonts();

  client = createClient();
  registerEvents(client);
  registerShutdownHooks();
  startEventLoopMonitor();

  await client.login(process.env.BOT_TOKEN);
  logger.info('stealth is ready');
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});