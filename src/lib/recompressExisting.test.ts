import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { CompressResult } from './imageCompression';
import { buildRecompressPlan, recompressExisting, type RecompressDeps } from './recompressExisting';

const SUPA = 'https://gupcgjwnattzhcsqecku.supabase.co/storage/v1/object/public/event-images/';
const VERCEL = 'https://raspisanie-azizhitsa-617d313b.vercel.app/sb/storage/v1/object/public/event-images/';
const NEW_FILE_RE = /^events\/\d+-[a-z0-9]+\.jpg$/;

type Row = { id: string; image_url: string | null };

/** Поддельный клиент Supabase: таблица events в памяти + журнал операций с хранилищем. */
function fakeSupabase(initialRows: Row[], opts: { failUpdateTo?: (url: string) => boolean } = {}) {
  const rows = initialRows.map((r) => ({ ...r }));
  const uploads: { bucket: string; path: string; file: File; options: unknown }[] = [];
  const removed: { bucket: string; paths: string[] }[] = [];
  const updates: { ids: string[]; url: string }[] = [];

  const client = {
    from(table: string) {
      expect(table).toBe('events');
      return {
        select: () => ({
          not: () => ({
            order: () => ({
              range: async (from: number, to: number) => ({
                data: rows.filter((r) => r.image_url !== null).slice(from, to + 1).map((r) => ({ ...r })),
                error: null,
              }),
            }),
          }),
        }),
        update: (values: { image_url: string }) => ({
          in: (_col: string, ids: string[]) => ({
            select: async () => {
              if (opts.failUpdateTo?.(values.image_url)) {
                return { data: null, error: { message: 'permission denied' } };
              }
              updates.push({ ids: [...ids], url: values.image_url });
              const touched = rows.filter((r) => ids.includes(r.id));
              touched.forEach((r) => (r.image_url = values.image_url));
              return { data: touched.map((r) => ({ id: r.id })), error: null };
            },
          }),
        }),
      };
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File, options: unknown) => {
          uploads.push({ bucket, path, file, options });
          return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          removed.push({ bucket, paths });
          return { data: [], error: null };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, rows, uploads, removed, updates };
}

/** Поддельный загрузчик: по имени файла отдаёт содержимое нужного размера или ошибку. */
function fakeFetch(sizes: Record<string, number | 'error' | 404>) {
  const calls: string[] = [];
  const fetchFile: RecompressDeps['fetchFile'] = async (url) => {
    calls.push(url);
    const name = url.split('/').pop() ?? '';
    const size = sizes[name];
    if (size === 'error' || size === undefined) throw new Error('network error');
    if (size === 404) return { ok: false, status: 404, blob: async () => new Blob([]) };
    return { ok: true, status: 200, blob: async () => new Blob([new Uint8Array(size)], { type: 'image/jpeg' }) };
  };
  return { fetchFile, calls };
}

/** Поддельное сжатие: результат = доля от исходного размера. */
function fakeCompress(share = 0.1) {
  return vi.fn(async (file: File): Promise<CompressResult> => {
    const finalBytes = Math.round(file.size * share);
    return {
      file: new File([new Uint8Array(finalBytes)], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }),
      originalBytes: file.size,
      finalBytes,
      changed: true,
      width: 2000,
      height: 1500,
    };
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildRecompressPlan', () => {
  it('группирует события по файлу и пропускает посторонние адреса', () => {
    const plan = buildRecompressPlan([
      { id: '1', image_url: `${SUPA}events/a.jpg` },
      { id: '2', image_url: `${VERCEL}events/a.jpg` },
      { id: '3', image_url: 'https://images.unsplash.com/photo.jpg' },
      { id: '4', image_url: '' },
      { id: '5', image_url: null },
    ]);
    expect(plan.files).toHaveLength(1);
    expect(plan.files[0].path).toBe('events/a.jpg');
    expect(plan.files[0].canonicalUrl).toBe(`${SUPA}events/a.jpg`);
    expect(plan.files[0].events.map((e) => e.id)).toEqual(['1', '2']);
    expect(plan.skippedExternal).toBe(1);
  });
});

describe('recompressExisting', () => {
  it('маленький файл с адресом vercel.app → только исправление адреса', async () => {
    const db = fakeSupabase([
      { id: 'e1', image_url: `${VERCEL}events/small.jpg` },
      { id: 'e2', image_url: `${SUPA}events/small.jpg` },
    ]);
    const { fetchFile } = fakeFetch({ 'small.jpg': 400_000 });
    const compress = fakeCompress();

    const report = await recompressExisting({ supabase: db.client, fetchFile, compress });

    expect(compress).not.toHaveBeenCalled();
    expect(db.uploads).toHaveLength(0);
    expect(db.updates).toEqual([{ ids: ['e1'], url: `${SUPA}events/small.jpg` }]);
    expect(db.rows.map((r) => r.image_url)).toEqual([`${SUPA}events/small.jpg`, `${SUPA}events/small.jpg`]);
    expect(report).toMatchObject({ totalFiles: 1, compressedFiles: 0, addressesFixed: 1, errors: [] });
    expect(db.removed).toHaveLength(0);
  });

  it('большой файл → новая копия и обновление всех его событий', async () => {
    const db = fakeSupabase([
      { id: 'e3', image_url: `${VERCEL}events/big.jpg` },
      { id: 'e4', image_url: `${SUPA}events/big.jpg` },
      { id: 'e5', image_url: 'https://example.com/outside.jpg' },
    ]);
    const { fetchFile } = fakeFetch({ 'big.jpg': 5_000_000 });
    const compress = fakeCompress(0.1);
    const progress: string[] = [];

    const report = await recompressExisting({
      supabase: db.client,
      fetchFile,
      compress,
      onProgress: (p) => progress.push(`${p.done}/${p.total}`),
    });

    expect(compress).toHaveBeenCalledTimes(1);
    expect(db.uploads).toHaveLength(1);
    const upload = db.uploads[0];
    expect(upload.bucket).toBe('event-images');
    expect(upload.path).toMatch(NEW_FILE_RE);
    expect(upload.path).not.toBe('events/big.jpg');
    expect(upload.options).toEqual({ cacheControl: '31536000', contentType: 'image/jpeg' });

    const newUrl = `${SUPA}${upload.path}`;
    expect(db.updates).toEqual([{ ids: ['e3', 'e4'], url: newUrl }]);
    expect(db.rows.find((r) => r.id === 'e5')?.image_url).toBe('https://example.com/outside.jpg');
    expect(report).toMatchObject({
      totalFiles: 1,
      compressedFiles: 1,
      bytesBefore: 5_000_000,
      bytesAfter: 500_000,
      errors: [],
    });
    expect(progress).toEqual(['0/1', '1/1']);
    // исходник не удаляется
    expect(db.removed).toHaveLength(0);
  });

  it('ошибка скачивания одного файла не мешает остальным; сначала свой origin, потом supabase.co', async () => {
    vi.stubEnv('DEV', false);
    const db = fakeSupabase([
      { id: 'a', image_url: `${VERCEL}events/broken.jpg` },
      { id: 'b', image_url: `${SUPA}events/fallback.jpg` },
      { id: 'c', image_url: `${SUPA}events/big.jpg` },
    ]);
    const { fetchFile, calls } = fakeFetch({ 'broken.jpg': 'error', 'big.jpg': 3_000_000 });
    // fallback.jpg: через /sb — 404, напрямую — 3 МБ
    const fetchWithFallback: RecompressDeps['fetchFile'] = async (url) => {
      if (url.endsWith('fallback.jpg')) {
        calls.push(url);
        if (url.includes('/sb/')) return { ok: false, status: 404, blob: async () => new Blob([]) };
        return { ok: true, status: 200, blob: async () => new Blob([new Uint8Array(3_000_000)], { type: 'image/jpeg' }) };
      }
      return fetchFile(url);
    };

    const report = await recompressExisting({ supabase: db.client, fetchFile: fetchWithFallback, compress: fakeCompress() });

    const origin = window.location.origin;
    expect(calls.filter((u) => u.endsWith('broken.jpg'))).toEqual([
      `${origin}/sb/storage/v1/object/public/event-images/events/broken.jpg`,
      `${SUPA}events/broken.jpg`,
    ]);
    expect(calls.filter((u) => u.endsWith('fallback.jpg'))).toEqual([
      `${origin}/sb/storage/v1/object/public/event-images/events/fallback.jpg`,
      `${SUPA}events/fallback.jpg`,
    ]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].path).toBe('events/broken.jpg');
    expect(report.compressedFiles).toBe(2);
    expect(db.uploads).toHaveLength(2);
    // событие со сломанным файлом не тронуто
    expect(db.rows.find((r) => r.id === 'a')?.image_url).toBe(`${VERCEL}events/broken.jpg`);
    expect(db.removed).toHaveLength(0);
  });

  it('если обновить события не удалось — удаляется только новая копия, исходник остаётся', async () => {
    const db = fakeSupabase([{ id: 'x', image_url: `${SUPA}events/big.jpg` }], {
      failUpdateTo: (url) => url !== `${SUPA}events/big.jpg`,
    });
    const { fetchFile } = fakeFetch({ 'big.jpg': 4_000_000 });

    const report = await recompressExisting({ supabase: db.client, fetchFile, compress: fakeCompress() });

    expect(db.uploads).toHaveLength(1);
    expect(db.removed).toEqual([{ bucket: 'event-images', paths: [db.uploads[0].path] }]);
    expect(db.removed.flatMap((r) => r.paths)).not.toContain('events/big.jpg');
    expect(report.compressedFiles).toBe(0);
    expect(report.errors).toHaveLength(1);
    expect(db.rows[0].image_url).toBe(`${SUPA}events/big.jpg`);
  });

  it('повторный запуск: уже сжатая копия не пережимается, файл без выигрыша не заменяется', async () => {
    const db = fakeSupabase([{ id: 'r', image_url: `${VERCEL}events/done.jpg` }]);
    const { fetchFile } = fakeFetch({ 'done.jpg': 1_400_000 });
    const compress = fakeCompress(0.97); // перекодирование своей же копии почти ничего не даёт

    const report = await recompressExisting({ supabase: db.client, fetchFile, compress });

    expect(db.uploads).toHaveLength(0);
    expect(db.updates).toEqual([{ ids: ['r'], url: `${SUPA}events/done.jpg` }]);
    expect(report).toMatchObject({ compressedFiles: 0, addressesFixed: 1, errors: [] });
  });

  it('несжимаемый файл (changed: false) не загружается заново, адрес канонический — ничего не делаем', async () => {
    const db = fakeSupabase([{ id: 'n', image_url: `${SUPA}events/same.jpg` }]);
    const { fetchFile } = fakeFetch({ 'same.jpg': 1_800_000 });
    const compress = vi.fn(async (file: File): Promise<CompressResult> => ({
      file,
      originalBytes: file.size,
      finalBytes: file.size,
      changed: false,
      width: 1800,
      height: 1200,
    }));

    const report = await recompressExisting({ supabase: db.client, fetchFile, compress });

    expect(compress).toHaveBeenCalledTimes(1);
    expect(db.uploads).toHaveLength(0);
    expect(db.updates).toHaveLength(0);
    expect(report).toMatchObject({ compressedFiles: 0, addressesFixed: 0, errors: [] });
  });
});
