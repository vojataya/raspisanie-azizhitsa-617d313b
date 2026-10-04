// Бережное сжатие фото перед загрузкой.
//
// Главное правило: фото не должно стать заметно хуже. Лучше оставить файл крупнее,
// чем пережать. Поэтому качество JPEG не опускается ниже 0.76, а маленькие файлы
// с нормальными сторонами не перекодируются вовсе.

export const IMAGE_LIMITS = {
  /** Длинная сторона после уменьшения, px (карточка и окно виджета не шире ~700 px). */
  maxLongSide: 2000,
  /** Файлы до этого размера с нормальными сторонами не трогаем. */
  skipBelowBytes: 1_000_000,
  /** Желаемый размер результата. */
  targetBytes: 1_500_000,
  /** Жёсткий потолок (шлюз пропускает до 2,5 МБ на запрос). */
  hardLimitBytes: 2_200_000,
  startQuality: 0.86,
  minQuality: 0.76,
  qualityStep: 0.04,
  /** Если на 2000 px не укладываемся даже на минимальном качестве — пробуем меньше. */
  fallbackLongSides: [1600, 1280] as readonly number[],
} as const;

export const UNSUPPORTED_IMAGE_MESSAGE =
  'Не удалось обработать файл. Сохраните фото как JPG или PNG и попробуйте снова';
export const TOO_BIG_IMAGE_MESSAGE =
  'Фото слишком большое даже после сжатия. Уменьшите его в редакторе или выберите другое фото';

export interface DecodedImage {
  width: number;
  height: number;
  render(targetWidth: number, targetHeight: number, quality: number): Promise<Blob>;
  close(): void;
}

export interface ImageCodec {
  decode(file: Blob): Promise<DecodedImage>;
}

export interface CompressResult {
  file: File;
  originalBytes: number;
  finalBytes: number;
  changed: boolean;
  /** Стороны результата; 0, если файл не удалось декодировать (отдан как есть). */
  width: number;
  height: number;
}

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_TO_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function effectiveType(file: File): string {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/jpg') return 'image/jpeg';
  if (type) return type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_TYPE[ext] ?? '';
}

/** Ступени качества: 0.86, 0.82, 0.78 и последняя — ровно minQuality (0.76). */
export function qualitySteps(limits = IMAGE_LIMITS): number[] {
  const steps: number[] = [];
  let q = limits.startQuality;
  while (q > limits.minQuality + 1e-9) {
    steps.push(q);
    q = Math.round((q - limits.qualityStep) * 1000) / 1000;
  }
  steps.push(limits.minQuality);
  return steps;
}

/** Длинные стороны для попыток: сначала ≤ maxLongSide, потом запасные (никогда не увеличиваем). */
function longSidePlan(longSide: number, limits = IMAGE_LIMITS): number[] {
  const plan = [Math.min(longSide, limits.maxLongSide)];
  for (const side of limits.fallbackLongSides) {
    if (side < plan[plan.length - 1]) plan.push(side);
  }
  return plan;
}

function fitLongSide(width: number, height: number, longSide: number) {
  const scale = Math.min(1, longSide / Math.max(width, height));
  if (scale === 1) return { width, height };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function jpgName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || 'photo'}.jpg`;
}

export async function compressImage(file: File, codec: ImageCodec = browserCodec): Promise<CompressResult> {
  const L = IMAGE_LIMITS;
  const originalBytes = file.size;
  const keepOriginal = (width = 0, height = 0): CompressResult => ({
    file,
    originalBytes,
    finalBytes: originalBytes,
    changed: false,
    width,
    height,
  });
  // Файл, который не умеем обработать: пропускаем, если он и так влезает в лимит.
  const cannotProcess = (width = 0, height = 0): CompressResult => {
    if (originalBytes <= L.hardLimitBytes) return keepOriginal(width, height);
    throw new Error(UNSUPPORTED_IMAGE_MESSAGE);
  };

  if (!SUPPORTED_TYPES.includes(effectiveType(file))) return cannotProcess();

  let image: DecodedImage;
  try {
    image = await codec.decode(file);
  } catch {
    return cannotProcess();
  }

  try {
    const { width, height } = image;
    if (!(width > 0 && height > 0)) return cannotProcess();

    const sidesOk = Math.max(width, height) <= L.maxLongSide;
    // Маленький файл с нормальными сторонами не перекодируем: потеря качества без пользы.
    if (originalBytes <= L.skipBelowBytes && sidesOk) return keepOriginal(width, height);

    type Candidate = { blob: Blob; width: number; height: number };
    let accepted: Candidate | null = null;
    let smallest: Candidate | null = null;

    search: for (const side of longSidePlan(Math.max(width, height))) {
      const size = fitLongSide(width, height, side);
      for (const quality of qualitySteps()) {
        let blob: Blob;
        try {
          blob = await image.render(size.width, size.height, quality);
        } catch {
          return cannotProcess(width, height);
        }
        const candidate = { blob, ...size };
        if (blob.size <= L.targetBytes) {
          accepted = candidate;
          break search;
        }
        if (!smallest || blob.size < smallest.blob.size) smallest = candidate;
      }
    }

    if (!accepted && smallest && smallest.blob.size <= L.hardLimitBytes) accepted = smallest;
    if (!accepted) {
      // Ничего не влезло в лимит, но исходник и так в норме — оставляем его.
      if (originalBytes <= L.hardLimitBytes && sidesOk) return keepOriginal(width, height);
      throw new Error(TOO_BIG_IMAGE_MESSAGE);
    }

    // Сжатие не дало выигрыша, а исходник в норме — оставляем исходник.
    if (accepted.blob.size >= originalBytes && originalBytes <= L.hardLimitBytes && sidesOk) {
      return keepOriginal(width, height);
    }

    const result = new File([accepted.blob], jpgName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    return {
      file: result,
      originalBytes,
      finalBytes: result.size,
      changed: true,
      width: accepted.width,
      height: accepted.height,
    };
  } finally {
    image.close();
  }
}

/** «4,1 МБ» / «850 КБ» — для сообщений в интерфейсе. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 КБ';
  if (bytes < 100_000) return `${Math.max(1, Math.round(bytes / 1000))} КБ`;
  const mb = bytes / 1_000_000;
  return `${mb.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} МБ`;
}

// ---------- Браузерный кодек (canvas) ----------

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

async function decodeSource(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // ниже — запасной вариант через <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Уменьшение: при сжатии больше чем вдвое — ступенчато, половинами (без алиасинга). */
function resizeOnWhite(source: CanvasImageSource, srcWidth: number, srcHeight: number, width: number, height: number) {
  let current: CanvasImageSource = source;
  let cw = srcWidth;
  let ch = srcHeight;
  while (cw > width * 2 && ch > height * 2) {
    const nw = Math.round(cw / 2);
    const nh = Math.round(ch / 2);
    const step = createCanvas(nw, nh);
    context2d(step).drawImage(current, 0, 0, nw, nh);
    current = step;
    cw = nw;
    ch = nh;
  }
  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);
  // Прозрачность PNG/WebP ложится на белое (в JPEG альфа-канала нет).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(current, 0, 0, width, height);
  return canvas;
}

export const browserCodec: ImageCodec = {
  async decode(file) {
    const { source, width, height, release } = await decodeSource(file);
    let cached: { width: number; height: number; canvas: HTMLCanvasElement } | null = null;
    return {
      width,
      height,
      render(targetWidth, targetHeight, quality) {
        if (!cached || cached.width !== targetWidth || cached.height !== targetHeight) {
          cached = { width: targetWidth, height: targetHeight, canvas: resizeOnWhite(source, width, height, targetWidth, targetHeight) };
        }
        const canvas = cached.canvas;
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сохранить JPEG'))),
            'image/jpeg',
            quality,
          );
        });
      },
      close() {
        cached = null;
        release();
      },
    };
  },
};
