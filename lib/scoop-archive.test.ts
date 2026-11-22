import { describe, expect, it } from 'vitest';
import { ARCHIVE_MS, archiveExpired, splitArchive } from './scoop-archive';

const now = Date.UTC(2026, 10, 20, 12);

describe('archiveExpired', () => {
  it('keeps posts younger than seven days', () => {
    expect(archiveExpired({ id: 'a', createdAt: now - ARCHIVE_MS + 60_000 }, now)).toBe(false);
  });
  it('drops posts older than seven days', () => {
    expect(archiveExpired({ id: 'a', createdAt: now - ARCHIVE_MS - 60_000 }, now)).toBe(true);
  });
  it('never drops an entry without a usable date', () => {
    expect(archiveExpired({ id: 'a' }, now)).toBe(false);
    expect(archiveExpired({ id: 'a', createdAt: 'soon' }, now)).toBe(false);
  });
});

describe('splitArchive', () => {
  it('returns expired ids with only string photo URLs', () => {
    const old = { id: 'old', createdAt: now - ARCHIVE_MS * 2, assets: ['https://x.public.blob.vercel-storage.com/a.jpg', 4] };
    const fresh = { id: 'new', createdAt: now - 1000, assets: [] };
    const { keep, expired } = splitArchive([old, fresh], now);
    expect(keep.map((e) => e.id)).toEqual(['new']);
    expect(expired).toEqual([{ id: 'old', assets: ['https://x.public.blob.vercel-storage.com/a.jpg'] }]);
  });
});
