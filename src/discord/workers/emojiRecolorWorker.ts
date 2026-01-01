import { parentPort } from 'node:worker_threads';
import { deflateSync, inflateSync } from 'node:zlib';

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

type DecodedPng = {
  width: number;
  height: number;
  data: Uint8Array;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function parseColor(color: string) {
  const normalized = color.replace('#', '').toLowerCase();
  const hasAlpha = normalized.length === 8;
  const alpha = hasAlpha ? Number.parseInt(normalized.slice(0, 2), 16) : 255;
  const offset = hasAlpha ? 2 : 0;
  const r = Number.parseInt(normalized.slice(offset, offset + 2), 16);
  const g = Number.parseInt(normalized.slice(offset + 2, offset + 4), 16);
  const b = Number.parseInt(normalized.slice(offset + 4, offset + 6), 16);
  return { r, g, b, alpha };
}

function recolorPng(buffer: Buffer, color: string) {
  const { r, g, b, alpha } = parseColor(color);
  const alphaMultiplier = alpha / 255;
  const { width, height, data } = decodePng(buffer);

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i] ?? 0;
    const green = data[i + 1] ?? 0;
    const blue = data[i + 2] ?? 0;

    if (red === 0 && green === 0 && blue === 0) {
      data[i + 3] = 0;
    } else {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.round((data[i + 3] ?? 0) * alphaMultiplier);
    }
  }

  return encodePng({ width, height, data });
}

function decodePng(buffer: Buffer): DecodedPng {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG signature.');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkData = buffer.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8] ?? 0;
      colorType = chunkData[9] ?? 0;
      interlace = chunkData[12] ?? 0;
    } else if (type === 'IDAT') {
      idatChunks.push(chunkData);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error('Unsupported PNG format. Only 8-bit RGBA PNGs are supported.');
  }
  if (interlace !== 0) {
    throw new Error('Interlaced PNGs are not supported.');
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const output = new Uint8Array(width * height * bytesPerPixel);

  let inOffset = 0;
  let outOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inOffset] ?? 0;
    inOffset += 1;

    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inOffset] ?? 0;
      const left = x >= bytesPerPixel ? output[outOffset - bytesPerPixel] ?? 0 : 0;
      const up = y > 0 ? output[outOffset - stride] ?? 0 : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? output[outOffset - stride - bytesPerPixel] ?? 0 : 0;

      let value = 0;
      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = (raw + left) & 0xff;
          break;
        case 2:
          value = (raw + up) & 0xff;
          break;
        case 3:
          value = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          value = (raw + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter: ${filterType}`);
      }

      output[outOffset] = value;
      inOffset += 1;
      outOffset += 1;
    }
  }

  return { width, height, data: output };
}

function encodePng(decoded: DecodedPng): Buffer {
  const { width, height, data } = decoded;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const source = Buffer.from(data);
  let rawOffset = 0;
  let dataOffset = 0;

  for (let y = 0; y < height; y += 1) {
    raw[rawOffset] = 0;
    rawOffset += 1;
    source.copy(raw, rawOffset, dataOffset, dataOffset + stride);
    rawOffset += stride;
    dataOffset += stride;
  }

  const compressed = deflateSync(raw);

  const chunks: Buffer[] = [];
  chunks.push(PNG_SIGNATURE);
  chunks.push(buildChunk('IHDR', buildIHDR(width, height)));
  chunks.push(buildChunk('IDAT', compressed));
  chunks.push(buildChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function buildIHDR(width: number, height: number) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function buildChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paethPredictor(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function handleRequest(message: WorkerRequest): WorkerResponse {
  const buffer = Buffer.from(message.buffer);
  const recolored = recolorPng(buffer, message.color);
  const output = Uint8Array.from(recolored);
  return { id: message.id, buffer: output.buffer };
}

parentPort?.on('message', (message: WorkerRequest) => {
  try {
    const response = handleRequest(message);
    parentPort?.postMessage(response, response.buffer ? [response.buffer] : []);
  } catch (error) {
    const response: WorkerResponse = {
      id: message.id,
      error: error instanceof Error ? error.message : 'Unknown worker error.'
    };
    parentPort?.postMessage(response);
  }
});