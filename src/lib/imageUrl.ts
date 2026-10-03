// Адреса картинок событий в Supabase Storage.
//
// В базе храним только канонический адрес (домен supabase.co): он не зависит от того,
// на каком хостинге открыт сайт. Для показа в проде адрес переписывается на свой origin (/sb),
// так как supabase.co напрямую недоступен части российских провайдеров.

export const SUPABASE_ORIGIN = 'https://gupcgjwnattzhcsqecku.supabase.co';
export const EVENT_IMAGES_BUCKET = 'event-images';

const STORAGE_MARKER = '/storage/v1/';
const BUCKET_MARKER = `/${EVENT_IMAGES_BUCKET}/`;

export function isStorageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.includes(STORAGE_MARKER);
}

/** Любой адрес хранилища → адрес на supabase.co. Прочие адреса не меняются. */
export function canonicalStorageUrl(url: string): string {
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx < 0) return url;
  return SUPABASE_ORIGIN + url.slice(idx);
}

/** Адрес для <img>: в проде — через свой origin (/sb), в dev — канонический. */
export function toDisplayUrl(url: string): string;
export function toDisplayUrl(url: string | null | undefined): string | null | undefined;
export function toDisplayUrl(url: string | null | undefined): string | null | undefined {
  if (url === null || url === undefined) return url;
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx < 0) return url;
  if (import.meta.env.DEV) return SUPABASE_ORIGIN + url.slice(idx);
  return `${window.location.origin}/sb${url.slice(idx)}`;
}

/** Путь файла внутри бакета event-images (например, events/123-abc.jpg) или null. */
export function eventImagePathFromUrl(url: string | null | undefined): string | null {
  if (!isStorageUrl(url)) return null;
  const idx = url.indexOf(BUCKET_MARKER);
  if (idx < 0) return null;
  const path = url.slice(idx + BUCKET_MARKER.length).split(/[?#]/)[0];
  return path || null;
}

/** Канонический публичный адрес файла из бакета event-images. */
export function eventImagePublicUrl(path: string): string {
  return `${SUPABASE_ORIGIN}/storage/v1/object/public/${EVENT_IMAGES_BUCKET}/${path}`;
}

/** Новый уникальный путь для загрузки: events/<время>-<случайное>.<ext> */
export function newEventImagePath(ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `events/${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
}

/** Опции загрузки: имена файлов уникальные, поэтому кэшировать на год безопасно. */
export function eventImageUploadOptions(contentType: string) {
  return { cacheControl: '31536000', contentType: contentType || undefined };
}
