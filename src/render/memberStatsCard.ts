import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../shared/logger.js';
import type { MemberStatsPoint } from '../services/memberStatsService.js';

export type MemberStatsCardInput = {
  memberCount: number;
  totalJoins: number;
  totalLeaves: number;
  points: MemberStatsPoint[];
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 810;

const TEMPLATE_PATH = path.join(process.cwd(), 'src', 'assets', 'images', 'stats_member_template.png');

const JOIN_COUNT_X = 463;
const JOIN_COUNT_Y = 653;

const LEAVE_COUNT_X = 463;
const LEAVE_COUNT_Y = 550;

const CURRENT_COUNT_X = 945;
const CURRENT_COUNT_Y = 138;

const GRAPH_LEFT_X = 677;
const GRAPH_RIGHT_X = 1773;
const GRAPH_BOTTOM_Y = 595;
const GRAPH_TOP_Y = 199;

const DATE_FIRST_X = 692;
const DATE_LAST_X = 1725;
const DATE_Y = 631;

const LEFT_LABEL_X = 626;
const LEFT_LABEL_YS = [614, 515, 416, 317, 218];

const LINE_COLOR = '#1E4CFF';
const FILL_COLOR = 'rgba(30, 76, 255, 0.2)';

const TEXT_TOP_Y_SHIFT = 5;
const TEXT_LEFT_X_SHIFT = 2;

type TextMetricsLike = {
  width: number;
  actualBoundingBoxAscent?: number;
  actualBoundingBoxDescent?: number;
};

type CanvasContext = {
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  closePath: () => void;
  fill: () => void;
  stroke: () => void;
  save: () => void;
  restore: () => void;
  drawImage: (image: unknown, dx: number, dy: number, dw?: number, dh?: number) => void;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  fillText: (text: string, x: number, y: number) => void;
  measureText: (text: string) => TextMetricsLike;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textBaseline: string;
  textAlign: string;
};

let templatePromise: Promise<Awaited<ReturnType<typeof loadImage>> | null> | null = null;

async function getTemplateImage() {
  if (!templatePromise) {
    templatePromise = readFile(TEMPLATE_PATH)
      .then((buffer) => loadImage(buffer))
      .catch((error) => {
        logger.error(error);
        return null;
      });
  }
  return templatePromise;
}

const fontAscentCache = new Map<string, number>();

function getFontAscent(ctx: CanvasContext) {
  const key = ctx.font;
  const cached = fontAscentCache.get(key);
  if (cached !== undefined) return cached;

  const metrics = ctx.measureText('Hg');
  const ascent = typeof metrics.actualBoundingBoxAscent === 'number' ? metrics.actualBoundingBoxAscent : 0;
  fontAscentCache.set(key, ascent);
  return ascent;
}

function drawTextTop(ctx: CanvasContext, text: string, x: number, topY: number) {
  const ascent = getFontAscent(ctx);
  ctx.fillText(text, x + TEXT_LEFT_X_SHIFT, topY + ascent + TEXT_TOP_Y_SHIFT);
}

function formatIntRu(value: number) {
  return Math.floor(value).toLocaleString('ru-RU');
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
}

function buildGraphPoints(points: MemberStatsPoint[]) {
  const fallbackPoint = { date: new Date(), memberCount: 0 } as MemberStatsPoint;
  return points.length > 0 ? points : [fallbackPoint];
}

export async function renderMemberStatsCard(input: MemberStatsCardInput): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d') as unknown as CanvasContext;

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const template = await getTemplateImage();
  if (template) {
    ctx.drawImage(template, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.fillStyle = '#0E1012';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  ctx.font = '600 32px "Inter"';
  ctx.fillStyle = '#00BBFF';
  drawTextTop(ctx, formatIntRu(input.totalJoins), JOIN_COUNT_X, JOIN_COUNT_Y);
  drawTextTop(ctx, formatIntRu(input.totalLeaves), LEAVE_COUNT_X, LEAVE_COUNT_Y);
  drawTextTop(ctx, formatIntRu(input.memberCount), CURRENT_COUNT_X, CURRENT_COUNT_Y);

  const graphPoints = buildGraphPoints(input.points);
  const minMembers = Math.min(...graphPoints.map((point) => point.memberCount));
  const maxMembers = Math.max(...graphPoints.map((point) => point.memberCount));
  const range = Math.max(1, maxMembers - minMembers);

  const graphWidth = GRAPH_RIGHT_X - GRAPH_LEFT_X;
  const graphHeight = GRAPH_BOTTOM_Y - GRAPH_TOP_Y;
  const xStep = graphPoints.length > 1 ? graphWidth / (graphPoints.length - 1) : 0;

  const pointCoords = graphPoints.map((point, index) => {
    const ratio = (point.memberCount - minMembers) / range;
    const x = GRAPH_LEFT_X + index * xStep;
    const y = GRAPH_BOTTOM_Y - ratio * graphHeight;
    return { x, y, point };
  });

  const firstPoint = pointCoords[0];
  const lastPoint = pointCoords[pointCoords.length - 1];
  if (!firstPoint || !lastPoint) {
    return canvas.toBuffer('image/png');
  }

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, GRAPH_BOTTOM_Y);
  pointCoords.forEach(({ x, y }) => ctx.lineTo(x, y));
  ctx.lineTo(lastPoint.x, GRAPH_BOTTOM_Y);
  ctx.closePath();
  ctx.fillStyle = FILL_COLOR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);
  pointCoords.slice(1).forEach(({ x, y }) => ctx.lineTo(x, y));
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.font = '600 20px "Inter"';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const labelCount = LEFT_LABEL_YS.length;
  const labelStep = (maxMembers - minMembers) / (labelCount - 1 || 1);
  const labelValues = LEFT_LABEL_YS.map((_, index) => Math.round(minMembers + labelStep * index));
  labelValues.forEach((value, index) => {
    const y = LEFT_LABEL_YS[index];
    if (typeof y !== 'number') return;
    drawTextTop(ctx, formatIntRu(value), LEFT_LABEL_X, y);
  });

  ctx.font = '600 20px "Inter"';
  ctx.fillStyle = '#6E706B';
  const dateWidth = DATE_LAST_X - DATE_FIRST_X;
  const dateStep = graphPoints.length > 1 ? dateWidth / (graphPoints.length - 1) : 0;
  graphPoints.forEach((point, index) => {
    const x = DATE_FIRST_X + index * dateStep;
    drawTextTop(ctx, formatDateLabel(point.date), x, DATE_Y);
  });

  return canvas.toBuffer('image/png');
}