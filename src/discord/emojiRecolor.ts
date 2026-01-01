import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { Client } from 'discord.js';
import { logger } from '../shared/logger.js';

const BASE_DIR = join(process.cwd(), 'data', 'emoji-base');

type RecolorResult = {
  updated: number;
  skipped: number;
  failed: number;
};

type RecolorOptions = {
  client: Client;
  color: string | null;
  onProgress?: (progress: { current: number; total: number }) => Promise<void> | void;
};

type WorkerRequest = {
  id: number;
  buffer: ArrayBuffer;
  color: string;
};

type WorkerResponse = {
  id: number;
  buffer?: ArrayBuffer;
  error?: string;
};

type RecolorWorker = {
  recolor: (buffer: Buffer, color: string) => Promise<Buffer>;
  close: () => Promise<void>;
};

function createRecolorWorker(): RecolorWorker {
  const worker = new Worker(new URL('./workers/emojiRecolorWorker.js', import.meta.url), {
    type: 'module'
  });
  const pending = new Map<number, { resolve: (buffer: Buffer) => void; reject: (error: Error) => void }>();
  let nextId = 1;

  const rejectAll = (error: Error) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  };

  worker.on('message', (message: WorkerResponse) => {
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) {
      entry.reject(new Error(message.error));
      return;
    }
    if (!message.buffer) {
      entry.reject(new Error('Worker returned empty buffer.'));
      return;
    }
    entry.resolve(Buffer.from(message.buffer));
  });

  worker.on('error', (error) => {
    rejectAll(error);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      rejectAll(new Error(`Emoji recolor worker exited with code ${code}.`));
    }
  });

  return {
    recolor: (buffer, color) =>
      new Promise((resolve, reject) => {
        const id = nextId;
        nextId += 1;
        pending.set(id, { resolve, reject });
        const view = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const payload: WorkerRequest = { id, buffer: view, color };
        worker.postMessage(payload, [view]);
      }),
    close: async () => {
      if (pending.size > 0) {
        const error = new Error('Emoji recolor worker terminated while requests are pending.');
        rejectAll(error);
      }
      await worker.terminate();
    }
  };
}

async function fetchEmojiBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Emoji fetch failed: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function buildTempName(name: string, id: string) {
  const suffix = `_tmp${id.slice(-4)}`;
  const maxBase = Math.max(1, 32 - suffix.length);
  return `${name.slice(0, maxBase)}${suffix}`;
}

export async function recolorApplicationEmojis(options: RecolorOptions): Promise<RecolorResult> {
  const { client, color, onProgress } = options;
  const result: RecolorResult = { updated: 0, skipped: 0, failed: 0 };

  if (!client.application) {
    logger.info('Application is not available for emoji recolor.');
    return result;
  }

  const recolorWorker = color ? createRecolorWorker() : null;
  await mkdir(BASE_DIR, { recursive: true });

  try {
    await client.application.fetch();
    const emojis = await client.application.emojis.fetch();
    const total = emojis.size;
    let processed = 0;
    await onProgress?.({ current: processed, total });

    for (const emoji of emojis.values()) {
      if (!emoji.name) {
        result.skipped += 1;
        processed += 1;
        await onProgress?.({ current: processed, total });
        continue;
      }

      const emojiUrl = emoji.url;
      if (!emojiUrl || !emojiUrl.toLowerCase().endsWith('.png')) {
        result.skipped += 1;
        processed += 1;
        await onProgress?.({ current: processed, total });
        continue;
      }

      try {
        const safeName = sanitizeFileName(emoji.name) || `emoji_${emoji.id}`;
        const basePath = join(BASE_DIR, `${safeName}.png`);
        let baseBuffer: Buffer;

        try {
          baseBuffer = await readFile(basePath);
        } catch {
          const original = await fetchEmojiBuffer(emojiUrl);
          baseBuffer = original;
          await writeFile(basePath, original);
        }

        const imageBuffer = color && recolorWorker ? await recolorWorker.recolor(baseBuffer, color) : baseBuffer;
        const tempName = buildTempName(emoji.name, emoji.id);
        const created = await client.application.emojis.create({
          attachment: imageBuffer,
          name: tempName
        });
        await emoji.delete();
        await created.edit({ name: emoji.name });
        result.updated += 1;
        processed += 1;
        await onProgress?.({ current: processed, total });
      } catch (error) {
        logger.error(error);
        result.failed += 1;
        processed += 1;
        await onProgress?.({ current: processed, total });
      }
    }
  } finally {
    await recolorWorker?.close();
  }

  return result;
}