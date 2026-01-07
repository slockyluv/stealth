import { GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
import { logger } from '../shared/logger.js';

let fontsRegistered = false;

export function registerCanvasFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  const basePath = path.join(process.cwd(), 'src', 'assets', 'fonts');
  const fonts = [
    { file: 'Montserrat-Bold.ttf', family: 'Montserrat' },
    { file: 'Inter-Bold.ttf', family: 'Inter' },
    { file: 'Inter-Medium.ttf', family: 'Inter' },
    { file: 'Inter-SemiBold.ttf', family: 'Inter' }
  ];

  for (const font of fonts) {
    const fullPath = path.join(basePath, font.file);
    const registered = GlobalFonts.registerFromPath(fullPath, font.family);
    if (!registered) {
      logger.info(`Failed to register font: ${font.file}`);
    }
  }

  logger.info('Canvas fonts registered');
}