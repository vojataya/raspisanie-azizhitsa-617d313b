import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SUPABASE_ORIGIN,
  canonicalStorageUrl,
  eventImagePathFromUrl,
  eventImagePublicUrl,
  toDisplayUrl,
} from './imageUrl';

const PATH = '/storage/v1/object/public/event-images/events/1700000000000-abc123.jpg';
const SUPA_URL = `https://gupcgjwnattzhcsqecku.supabase.co${PATH}`;
const VERCEL_URL = `https://raspisanie-azizhitsa-617d313b.vercel.app/sb${PATH}`;
const FOREIGN_URL = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('canonicalStorageUrl', () => {
  it('адрес supabase.co не меняется', () => {
    expect(canonicalStorageUrl(SUPA_URL)).toBe(SUPA_URL);
  });

  it('адрес vercel.app/sb приводится к supabase.co', () => {
    expect(canonicalStorageUrl(VERCEL_URL)).toBe(SUPA_URL);
  });

  it('посторонний адрес не меняется', () => {
    expect(canonicalStorageUrl(FOREIGN_URL)).toBe(FOREIGN_URL);
  });
});

describe('toDisplayUrl', () => {
  it('null и undefined возвращаются как есть', () => {
    expect(toDisplayUrl(null)).toBeNull();
    expect(toDisplayUrl(undefined)).toBeUndefined();
  });

  it('в проде оба вида адресов идут через свой origin /sb', () => {
    vi.stubEnv('DEV', false);
    const expected = `${window.location.origin}/sb${PATH}`;
    expect(toDisplayUrl(SUPA_URL)).toBe(expected);
    expect(toDisplayUrl(VERCEL_URL)).toBe(expected);
  });

  it('в dev оба вида адресов становятся каноническими', () => {
    vi.stubEnv('DEV', true);
    expect(toDisplayUrl(SUPA_URL)).toBe(SUPA_URL);
    expect(toDisplayUrl(VERCEL_URL)).toBe(SUPA_URL);
  });

  it('посторонний адрес не меняется ни в проде, ни в dev', () => {
    vi.stubEnv('DEV', false);
    expect(toDisplayUrl(FOREIGN_URL)).toBe(FOREIGN_URL);
    vi.stubEnv('DEV', true);
    expect(toDisplayUrl(FOREIGN_URL)).toBe(FOREIGN_URL);
  });
});

describe('пути файлов', () => {
  it('путь после /event-images/ одинаков для обоих видов адресов', () => {
    expect(eventImagePathFromUrl(SUPA_URL)).toBe('events/1700000000000-abc123.jpg');
    expect(eventImagePathFromUrl(VERCEL_URL)).toBe('events/1700000000000-abc123.jpg');
    expect(eventImagePathFromUrl(`${SUPA_URL}?t=1`)).toBe('events/1700000000000-abc123.jpg');
    expect(eventImagePathFromUrl(FOREIGN_URL)).toBeNull();
  });

  it('канонический адрес строится от SUPABASE_ORIGIN', () => {
    expect(eventImagePublicUrl('events/x.jpg')).toBe(
      `${SUPABASE_ORIGIN}/storage/v1/object/public/event-images/events/x.jpg`,
    );
  });
});
