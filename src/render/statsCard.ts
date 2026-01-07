import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type StatsCardInput = {
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  messageCount: number;
  voiceMinutes: number;
  streakDays: number;
  userAvatar: Buffer;
  partnerAvatar: Buffer;
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const AVATAR_X = 140;
const AVATAR_Y = 200;
const AVATAR_SIZE = 200;

const PARTNER_AVATAR_X = 380;
const PARTNER_AVATAR_Y = 220;
const PARTNER_AVATAR_SIZE = 140;

const NAME_X = 560;
const NAME_Y = 190;
const LEVEL_X = 560;
const LEVEL_Y = 280;
const XP_X = 560;
const XP_Y = 350;
const MESSAGE_X = 560;
const MESSAGE_Y = 420;
const VOICE_X = 560;
const VOICE_Y = 490;
const STREAK_X = 560;
const STREAK_Y = 560;

const PROGRESS_X = 142;
const PROGRESS_Y = 118;
const PROGRESS_W = 298;
const PROGRESS_H = 9;

const LIGHT_X = 142;
const LIGHT_Y = 150;
const LIGHT_GAP = 34;
const LIGHT_SIZE = 28;

type CanvasContext = {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  closePath: () => void;
  clip: () => void;
  save: () => void;
  restore: () => void;
  fill: () => void;
  drawImage: (image: unknown, dx: number, dy: number, dw?: number, dh?: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  fillStyle: string;
  font: string;
  textBaseline: string;
  textAlign: string;
};

const assetsRoot = path.join(process.cwd(), 'src', 'assets');
const templatePath = path.join(assetsRoot, 'images', 'profile_template.png');
const lightOnPath = path.join(assetsRoot, 'icons', 'lighton.png');
const lightOffPath = path.join(assetsRoot, 'icons', 'lightoff.png');

let templateImagePromise: ReturnType<typeof loadImage> | null = null;
let lightOnPromise: ReturnType<typeof loadImage> | null = null;
let lightOffPromise: ReturnType<typeof loadImage> | null = null;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function drawRoundedRect(ctx: CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawCircularImage(
  ctx: CanvasContext,
  image: Awaited<ReturnType<typeof loadImage>>,
  x: number,
  y: number,
  size: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
}

async function getTemplateImage() {
  if (!templateImagePromise) {
    templateImagePromise = readFile(templatePath).then((buffer) => loadImage(buffer));
  }
  return templateImagePromise;
}

async function getLightOn() {
  if (!lightOnPromise) {
    lightOnPromise = readFile(lightOnPath).then((buffer) => loadImage(buffer));
  }
  return lightOnPromise;
}

async function getLightOff() {
  if (!lightOffPromise) {
    lightOffPromise = readFile(lightOffPath).then((buffer) => loadImage(buffer));
  }
  return lightOffPromise;
}

export async function renderStatsCard(input: StatsCardInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d') as unknown as CanvasContext;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  const [template, lightOn, lightOff, userAvatar, partnerAvatar] = await Promise.all([
    getTemplateImage(),
    getLightOn(),
    getLightOff(),
    loadImage(input.userAvatar),
    loadImage(input.partnerAvatar)
  ]);

  ctx.drawImage(template, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawCircularImage(ctx, userAvatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE);
  drawCircularImage(ctx, partnerAvatar, PARTNER_AVATAR_X, PARTNER_AVATAR_Y, PARTNER_AVATAR_SIZE);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '48px "Montserrat"';
  ctx.fillText(input.displayName, NAME_X, NAME_Y);

  ctx.font = '34px "Inter"';
  ctx.fillText(`Уровень: ${input.level}`, LEVEL_X, LEVEL_Y);
  ctx.fillText(`XP: ${Math.floor(input.xp)} / ${Math.floor(input.xpToNext)}`, XP_X, XP_Y);

  ctx.font = '30px "Inter"';
  ctx.fillText(`Сообщений: ${input.messageCount}`, MESSAGE_X, MESSAGE_Y);
  ctx.fillText(`Голос: ${input.voiceMinutes} мин`, VOICE_X, VOICE_Y);
  ctx.fillText(`Серия: ${input.streakDays} дн.`, STREAK_X, STREAK_Y);

  const ratio = clamp(input.xpToNext > 0 ? input.xp / input.xpToNext : 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  drawRoundedRect(ctx, PROGRESS_X, PROGRESS_Y, PROGRESS_W, PROGRESS_H, PROGRESS_H);
  ctx.fill();

  ctx.fillStyle = '#1EA6FF';
  drawRoundedRect(ctx, PROGRESS_X, PROGRESS_Y, PROGRESS_W * ratio, PROGRESS_H, PROGRESS_H);
  ctx.fill();

  for (let i = 1; i <= 5; i += 1) {
    const icon = input.streakDays >= i ? lightOn : lightOff;
    const x = LIGHT_X + (i - 1) * LIGHT_GAP;
    ctx.drawImage(icon, x, LIGHT_Y, LIGHT_SIZE, LIGHT_SIZE);
  }

  return canvas.toBuffer('image/png');
}