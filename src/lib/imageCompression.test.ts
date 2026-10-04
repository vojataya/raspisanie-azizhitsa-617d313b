import { describe, expect, it } from 'vitest';
import {
  IMAGE_LIMITS,
  TOO_BIG_IMAGE_MESSAGE,
  UNSUPPORTED_IMAGE_MESSAGE,
  compressImage,
  formatBytes,
  qualitySteps,
  type ImageCodec,
} from './imageCompression';

/** Файл заданного размера (содержимое не важно — декодирует поддельный кодек). */
function makeFile(bytes: number, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/**
 * Поддельный кодек: размер результата = ширина × высота × bytesPerPixel × качество.
 * Так проверяется логика ступеней без canvas.
 */
function fakeCodec(width: number, height: number, bytesPerPixel: number, opts: { failDecode?: boolean } = {}) {
  const calls: { width: number; height: number; quality: number }[] = [];
  const state = { closed: false };
  const codec: ImageCodec = {
    async decode() {
      if (opts.failDecode) throw new Error('decode failed');
      return {
        width,
        height,
        async render(w, h, quality) {
          calls.push({ width: w, height: h, quality });
          return new Blob([new Uint8Array(Math.round(w * h * bytesPerPixel * quality))], { type: 'image/jpeg' });
        },
        close() {
          state.closed = true;
        },
      };
    },
  };
  return { codec, calls, state };
}

describe('qualitySteps', () => {
  it('0.86 → 0.82 → 0.78 → ровно 0.76', () => {
    expect(qualitySteps()).toEqual([0.86, 0.82, 0.78, 0.76]);
  });
});

describe('compressImage', () => {
  it('маленький файл с нормальными сторонами не перекодируется', async () => {
    const file = makeFile(500_000, 'small.jpg', 'image/jpeg');
    const { codec, calls, state } = fakeCodec(1200, 800, 1);
    const result = await compressImage(file, codec);
    expect(result.changed).toBe(false);
    expect(result.file).toBe(file);
    expect(result.finalBytes).toBe(500_000);
    expect(calls).toHaveLength(0);
    expect(state.closed).toBe(true);
  });

  it('7,6 МБ 4000×3000 → длинная сторона 2000, качество ≥ 0.76, размер ≤ targetBytes', async () => {
    const file = makeFile(7_600_000, 'IMG_0001.jpeg', 'image/jpeg');
    const { codec, calls } = fakeCodec(4000, 3000, 0.6);
    const result = await compressImage(file, codec);

    expect(result.changed).toBe(true);
    expect(result.originalBytes).toBe(7_600_000);
    expect(result.finalBytes).toBeLessThanOrEqual(IMAGE_LIMITS.targetBytes);
    expect(result.file.size).toBe(result.finalBytes);
    expect(Math.max(result.width, result.height)).toBe(2000);
    expect(result.width / result.height).toBeCloseTo(4 / 3, 2);
    for (const call of calls) {
      expect(call.quality).toBeGreaterThanOrEqual(IMAGE_LIMITS.minQuality);
      expect(Math.max(call.width, call.height)).toBeLessThanOrEqual(IMAGE_LIMITS.maxLongSide);
    }
    // 0.86 даёт 1,55 МБ (> 1,5 МБ), 0.82 — 1,48 МБ: остановились на второй ступени
    expect(calls.map((c) => c.quality)).toEqual([0.86, 0.82]);
    expect(result.file.name).toBe('IMG_0001.jpg');
    expect(result.file.type).toBe('image/jpeg');
  });

  it('несжимаемый файл проходит все ступени и даёт ошибку выше hardLimitBytes', async () => {
    const file = makeFile(9_000_000, 'noise.jpg', 'image/jpeg');
    const { codec, calls, state } = fakeCodec(4000, 3000, 3);
    await expect(compressImage(file, codec)).rejects.toThrow(TOO_BIG_IMAGE_MESSAGE);

    const steps = [0.86, 0.82, 0.78, 0.76];
    expect(calls.map((c) => [Math.max(c.width, c.height), c.quality])).toEqual([
      ...steps.map((q) => [2000, q]),
      ...steps.map((q) => [1600, q]),
      ...steps.map((q) => [1280, q]),
    ]);
    expect(state.closed).toBe(true);
  });

  it('если ничего не уложилось в targetBytes — берётся самый маленький результат ≤ hardLimitBytes', async () => {
    const file = makeFile(9_000_000, 'dense.jpg', 'image/jpeg');
    const { codec, calls } = fakeCodec(4000, 3000, 2);
    const result = await compressImage(file, codec);
    expect(calls).toHaveLength(12);
    expect(result.changed).toBe(true);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(960);
    expect(result.finalBytes).toBeGreaterThan(IMAGE_LIMITS.targetBytes);
    expect(result.finalBytes).toBeLessThanOrEqual(IMAGE_LIMITS.hardLimitBytes);
  });

  it('PNG → имя .jpg и тип image/jpeg', async () => {
    const file = makeFile(1_500_000, 'logo.png', 'image/png');
    const { codec } = fakeCodec(1000, 800, 1);
    const result = await compressImage(file, codec);
    expect(result.changed).toBe(true);
    expect(result.file.name).toBe('logo.jpg');
    expect(result.file.type).toBe('image/jpeg');
    expect(result.width).toBe(1000);
    expect(result.height).toBe(800);
  });

  it('результат не меньше исходника → возвращается исходник', async () => {
    const file = makeFile(1_200_000, 'ok.jpg', 'image/jpeg');
    const { codec, calls } = fakeCodec(1800, 1200, 0.7); // 0.86 → 1,30 МБ ≥ 1,2 МБ
    const result = await compressImage(file, codec);
    expect(calls.length).toBeGreaterThan(0);
    expect(result.changed).toBe(false);
    expect(result.file).toBe(file);
    expect(result.finalBytes).toBe(1_200_000);
  });

  it('лёгкий файл с огромными сторонами всё равно уменьшается до 2000 px', async () => {
    const file = makeFile(800_000, 'wide.jpg', 'image/jpeg');
    const { codec } = fakeCodec(6000, 2000, 0.05);
    const result = await compressImage(file, codec);
    expect(result.changed).toBe(true);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(667);
  });

  it('неподдерживаемый тип: в пределах лимита — без изменений, больше — понятная ошибка', async () => {
    const { codec, calls } = fakeCodec(800, 600, 1);
    const smallGif = makeFile(1_500_000, 'anim.gif', 'image/gif');
    const result = await compressImage(smallGif, codec);
    expect(result.changed).toBe(false);
    expect(result.file).toBe(smallGif);

    const bigHeic = makeFile(3_000_000, 'IMG.heic', 'image/heic');
    await expect(compressImage(bigHeic, codec)).rejects.toThrow(UNSUPPORTED_IMAGE_MESSAGE);
    expect(calls).toHaveLength(0);
  });

  it('декодирование не удалось: в пределах лимита — без изменений, больше — ошибка', async () => {
    const { codec } = fakeCodec(0, 0, 1, { failDecode: true });
    const ok = makeFile(2_000_000, 'broken.jpg', 'image/jpeg');
    expect((await compressImage(ok, codec)).changed).toBe(false);
    const big = makeFile(3_000_000, 'broken.jpg', 'image/jpeg');
    await expect(compressImage(big, codec)).rejects.toThrow(UNSUPPORTED_IMAGE_MESSAGE);
  });
});

describe('formatBytes', () => {
  it('мегабайты с запятой', () => {
    expect(formatBytes(4_100_000)).toBe('4,1 МБ');
    expect(formatBytes(600_000)).toBe('0,6 МБ');
    expect(formatBytes(45_000)).toBe('45 КБ');
  });
});
