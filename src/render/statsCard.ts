import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export type StatsCardInput = {
  displayName: string;
  level: number;
  xp: number;
  xpToNext: number;
  xpRemaining: number;
  messageCount: number;
  voiceHours: number;
  messageRank: number;
  donationAmount: number;
  streakDays: number;
  partnerName: string;
  userAvatar: Buffer;
  partnerAvatar: Buffer | null; // null => do not draw (leave template placeholder)
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// Global micro-shift to match your final visual alignment vs Figma.
const TEXT_TOP_Y_SHIFT = 6;
const TEXT_LEFT_X_SHIFT = 6;

const AVATAR_X = 846;
const AVATAR_Y = 146;
const AVATAR_SIZE = 228;

const PARTNER_AVATAR_X = 1325;
const PARTNER_AVATAR_Y = 147;
const PARTNER_AVATAR_SIZE = 143;

const NAME_X = 831;
const NAME_Y = 440;
const NAME_WIDTH = 257;

const LEVEL_X = 229;
const LEVEL_Y = 200;

const LEVEL_PROGRESS_X = 163;
const LEVEL_PROGRESS_Y = 392;

const NEXT_LEVEL_X = 163;
const NEXT_LEVEL_Y = 118;

const XP_REMAINING_X = 232;
const XP_REMAINING_Y = 347;

const PARTNER_NAME_X = 1512;
const PARTNER_NAME_Y = 213;
const PARTNER_NAME_WIDTH = 147;

const VOICE_HOURS_X = 1445;
const VOICE_HOURS_Y = 442;

const MESSAGE_COUNT_X = 1445;
const MESSAGE_COUNT_Y = 609;

const MESSAGE_RANK_X = 1445;
const MESSAGE_RANK_Y = 776;

const DONATION_X = 1026;
const DONATION_Y = 630;

const STREAK_DAYS_X = 830;
const STREAK_DAYS_Y = 925;

// Your figma: X=142 Y=118 W=298 H=9
// Bar must be vertical => interpret W as height and H as width.
const PROGRESS_X = 142;
const PROGRESS_Y = 118;
const PROGRESS_HEIGHT = 298; // W from figma
const PROGRESS_WIDTH = 9; // H from figma

const LIGHT_SIZE = 61;
const LIGHTS = [
  { x: 921, y: 927 },
  { x: 1116, y: 927 },
  { x: 1311, y: 927 },
  { x: 1506, y: 927 },
  { x: 1701, y: 927 }
];

// Minimal typing (napi canvas supports actualBoundingBoxAscent/Descent)
type TextMetricsLike = {
  width: number;
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
};

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
  measureText: (text: string) => TextMetricsLike;
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

function formatIntRu(value: number) {
  return Math.floor(value).toLocaleString('ru-RU');
}

function formatMoneyRu(value: number) {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function fitText(ctx: CanvasContext, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 0 ? `${trimmed}…` : '';
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

function drawVerticalProgressBar(ctx: CanvasContext, x: number, y: number, w: number, h: number, ratio: number) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  drawRoundedRect(ctx, x, y, w, h, w / 2);
  ctx.fill();

  const fillH = Math.max(0, Math.floor(h * ratio));
  const fillY = y + (h - fillH);

  ctx.fillStyle = '#1EA6FF';
  drawRoundedRect(ctx, x, fillY, w, fillH, w / 2);
  ctx.fill();
}

// Cache ascent per font string to match Figma "Top" coordinates.
const fontAscentCache = new Map<string, number>();

function getFontAscent(ctx: CanvasContext) {
  const key = ctx.font;
  const cached = fontAscentCache.get(key);
  if (cached !== undefined) return cached;

  const m = ctx.measureText('Hg');
  const ascent = typeof m.actualBoundingBoxAscent === 'number' ? m.actualBoundingBoxAscent : 0;

  fontAscentCache.set(key, ascent);
  return ascent;
}

function drawTextTop(ctx: CanvasContext, text: string, x: number, topY: number) {
  const ascent = getFontAscent(ctx);
  ctx.fillText(
    text,
    x + TEXT_LEFT_X_SHIFT,
    topY + ascent + TEXT_TOP_Y_SHIFT
  );
}

export async function renderStatsCard(input: StatsCardInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d') as unknown as CanvasContext;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const [template, lightOn, lightOff, userAvatar] = await Promise.all([
    getTemplateImage(),
    getLightOn(),
    getLightOff(),
    loadImage(input.userAvatar)
  ]);

  const partnerAvatarImage = input.partnerAvatar ? await loadImage(input.partnerAvatar) : null;

  ctx.drawImage(template, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawCircularImage(ctx, userAvatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE);
  if (partnerAvatarImage) {
    drawCircularImage(ctx, partnerAvatarImage, PARTNER_AVATAR_X, PARTNER_AVATAR_Y, PARTNER_AVATAR_SIZE);
  }

  ctx.fillStyle = '#FFFFFF';

  ctx.font = '700 48px "Montserrat"';
  drawTextTop(ctx, fitText(ctx, input.displayName, NAME_WIDTH), NAME_X, NAME_Y);

  ctx.font = '700 64px "Inter"';
  drawTextTop(ctx, String(input.level), LEVEL_X, LEVEL_Y);

  ctx.font = '500 20px "Inter"';
  drawTextTop(ctx, String(input.level), LEVEL_PROGRESS_X, LEVEL_PROGRESS_Y);
  drawTextTop(ctx, String(input.level + 1), NEXT_LEVEL_X, NEXT_LEVEL_Y);

  ctx.font = '500 24px "Inter"';
  drawTextTop(ctx, formatIntRu(input.xpRemaining), XP_REMAINING_X, XP_REMAINING_Y);

  ctx.font = '700 40px "Inter"';
  drawTextTop(ctx, fitText(ctx, input.partnerName, PARTNER_NAME_WIDTH), PARTNER_NAME_X, PARTNER_NAME_Y);

  ctx.font = '600 32px "Inter"';
  drawTextTop(ctx, `${formatIntRu(input.voiceHours)} ч.`, VOICE_HOURS_X, VOICE_HOURS_Y);
  drawTextTop(ctx, formatIntRu(input.messageCount), MESSAGE_COUNT_X, MESSAGE_COUNT_Y);
  drawTextTop(ctx, input.messageRank > 0 ? `#${formatIntRu(input.messageRank)}` : '#—', MESSAGE_RANK_X, MESSAGE_RANK_Y);

  ctx.font = '700 36px "Montserrat"';
  drawTextTop(ctx, formatMoneyRu(input.donationAmount), DONATION_X, DONATION_Y);

  ctx.font = '700 64px "Inter"';
  drawTextTop(ctx, formatIntRu(input.streakDays), STREAK_DAYS_X, STREAK_DAYS_Y);

  const ratio = clamp(input.xpToNext > 0 ? input.xp / input.xpToNext : 0);
  drawVerticalProgressBar(ctx, PROGRESS_X, PROGRESS_Y, PROGRESS_WIDTH, PROGRESS_HEIGHT, ratio);

  LIGHTS.forEach((light, index) => {
    const icon = input.streakDays >= index + 1 ? lightOn : lightOff;
    ctx.drawImage(icon, light.x, light.y, LIGHT_SIZE, LIGHT_SIZE);
  });

  return canvas.toBuffer('image/png');
}