// Разовое сжатие уже загруженных фото событий + приведение адресов к каноническому виду.
//
// Исходные файлы НЕ удаляются: сжатая копия загружается новым файлом, а у событий
// меняется только адрес. Повторный запуск безопасен: сжатые и канонические пропускаются.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { IMAGE_LIMITS, type CompressResult } from './imageCompression';
import {
  EVENT_IMAGES_BUCKET,
  canonicalStorageUrl,
  eventImagePathFromUrl,
  eventImagePublicUrl,
  eventImageUploadOptions,
  newEventImagePath,
  toDisplayUrl,
} from './imageUrl';

type Client = SupabaseClient<Database>;

export interface EventImageRow {
  id: string;
  image_url: string;
}

export interface ImageFileGroup {
  /** Путь внутри бакета event-images, например events/123-abc.jpg */
  path: string;
  /** Канонический адрес этого файла */
  canonicalUrl: string;
  events: EventImageRow[];
}

export interface RecompressPlan {
  files: ImageFileGroup[];
  /** Событий с картинкой не из хранилища (внешние ссылки) — их не трогаем */
  skippedExternal: number;
}

export interface RecompressError {
  path: string;
  message: string;
}

export interface RecompressReport {
  totalFiles: number;
  compressedFiles: number;
  bytesBefore: number;
  bytesAfter: number;
  addressesFixed: number;
  errors: RecompressError[];
}

export interface RecompressProgress {
  done: number;
  total: number;
}

export interface RecompressDeps {
  supabase: Client;
  /** Загрузчик файла по адресу (в браузере — fetch) */
  fetchFile: (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'blob'>>;
  compress: (file: File) => Promise<CompressResult>;
  onProgress?: (progress: RecompressProgress) => void;
}

const PAGE_SIZE = 1000;
/** Минимальный выигрыш, ради которого заменяем файл, уже укладывающийся в лимит. */
export const MIN_SAVING_SHARE = 0.15;

/** Группирует события по файлу хранилища. */
export function buildRecompressPlan(rows: { id: string; image_url: string | null }[]): RecompressPlan {
  const groups = new Map<string, ImageFileGroup>();
  let skippedExternal = 0;
  for (const row of rows) {
    const url = row.image_url?.trim();
    if (!url) continue;
    const path = eventImagePathFromUrl(url);
    if (!path) {
      skippedExternal += 1;
      continue;
    }
    let group = groups.get(path);
    if (!group) {
      group = { path, canonicalUrl: eventImagePublicUrl(path), events: [] };
      groups.set(path, group);
    }
    group.events.push({ id: row.id, image_url: url });
  }
  return { files: Array.from(groups.values()), skippedExternal };
}

/** Все события с непустой картинкой → план по файлам. */
export async function loadRecompressPlan(supabase: Client): Promise<RecompressPlan> {
  const rows: { id: string; image_url: string | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('id, image_url')
      .not('image_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Не удалось получить события: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return buildRecompressPlan(rows);
}

const EXT_TO_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

async function download(url: string, path: string, fetchFile: RecompressDeps['fetchFile']): Promise<File> {
  const attempts = Array.from(new Set([toDisplayUrl(url), canonicalStorageUrl(url)]));
  let lastProblem = 'неизвестная ошибка';
  for (const attempt of attempts) {
    try {
      const response = await fetchFile(attempt);
      if (!response.ok) {
        lastProblem = `ответ ${response.status}`;
        continue;
      }
      const blob = await response.blob();
      const name = path.split('/').pop() || 'photo';
      const ext = name.split('.').pop()?.toLowerCase() ?? '';
      const type = blob.type.startsWith('image/') ? blob.type : EXT_TO_TYPE[ext] ?? blob.type;
      return new File([blob], name, { type });
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`не удалось скачать (${lastProblem})`);
}

/** Меняет image_url у событий; возвращает число реально обновлённых строк. */
async function updateEventsUrl(supabase: Client, ids: string[], url: string): Promise<number> {
  const { data, error } = await supabase
    .from('events')
    .update({ image_url: url })
    .in('id', ids)
    .select('id');
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function recompressExisting(deps: RecompressDeps, plan?: RecompressPlan): Promise<RecompressReport> {
  const { supabase, fetchFile, compress, onProgress } = deps;
  const actualPlan = plan ?? (await loadRecompressPlan(supabase));
  const total = actualPlan.files.length;
  const report: RecompressReport = {
    totalFiles: total,
    compressedFiles: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    addressesFixed: 0,
    errors: [],
  };
  const fail = (path: string, message: string) => report.errors.push({ path, message });

  async function fixAddresses(group: ImageFileGroup) {
    const ids = group.events.filter((e) => e.image_url !== group.canonicalUrl).map((e) => e.id);
    if (ids.length === 0) return;
    const updated = await updateEventsUrl(supabase, ids, group.canonicalUrl);
    report.addressesFixed += updated;
    if (updated < ids.length) {
      fail(group.path, `адрес исправлен у ${updated} из ${ids.length} событий (нет прав?)`);
    }
  }

  async function processFile(group: ImageFileGroup) {
    // 1) скачать: сначала через свой origin, потом напрямую с supabase.co
    let original: File;
    try {
      original = await download(group.events[0].image_url, group.path, fetchFile);
    } catch (error) {
      fail(group.path, errorText(error));
      return;
    }

    // 2) маленький или несжимаемый файл не трогаем — только чиним адреса
    let compressed: CompressResult | null = null;
    if (original.size > IMAGE_LIMITS.skipBelowBytes) {
      try {
        compressed = await compress(original);
      } catch (error) {
        fail(group.path, `не удалось сжать: ${errorText(error)}`);
      }
    }
    // Выигрыш меньше 15% у файла, который и так проходит лимит, не стоит повторного
    // перекодирования: так уже сжатые копии не пережимаются при повторном запуске.
    const worthReplacing =
      compressed !== null &&
      compressed.changed &&
      (original.size > IMAGE_LIMITS.hardLimitBytes || compressed.finalBytes <= original.size * (1 - MIN_SAVING_SHARE));
    if (!compressed || !worthReplacing) {
      await fixAddresses(group);
      return;
    }

    // 3) сжатая копия — НОВЫМ файлом; исходник остаётся в хранилище как резерв
    const newPath = newEventImagePath('jpg');
    const { error: uploadError } = await supabase.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(newPath, compressed.file, eventImageUploadOptions(compressed.file.type));
    if (uploadError) {
      fail(group.path, `не удалось загрузить сжатую копию: ${uploadError.message}`);
      return;
    }

    const newUrl = eventImagePublicUrl(newPath);
    const ids = group.events.map((e) => e.id);
    let updated = 0;
    let updateProblem = '';
    try {
      updated = await updateEventsUrl(supabase, ids, newUrl);
    } catch (error) {
      updateProblem = errorText(error);
    }

    if (updated === 0) {
      // Ни одно событие не смотрит на копию — убираем только что загруженный файл.
      await supabase.storage.from(EVENT_IMAGES_BUCKET).remove([newPath]);
      fail(group.path, `не удалось обновить события: ${updateProblem || 'нет прав на изменение'}`);
      return;
    }

    report.compressedFiles += 1;
    report.bytesBefore += compressed.originalBytes;
    report.bytesAfter += compressed.finalBytes;
    if (updated < ids.length) {
      fail(group.path, `новый адрес записан у ${updated} из ${ids.length} событий (нет прав?)`);
    }
  }

  // Файлы по очереди; ошибка на одном не останавливает остальные.
  onProgress?.({ done: 0, total });

  for (const [index, group] of actualPlan.files.entries()) {
    try {
      await processFile(group);
    } catch (error) {
      fail(group.path, errorText(error));
    }
    onProgress?.({ done: index + 1, total });
  }
  return report;
}
