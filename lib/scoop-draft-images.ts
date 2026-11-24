/** Screenshots sent with a draft. They are read once and never stored. */

export const DRAFT_IMAGE_LIMIT = 3;
export const DRAFT_IMAGE_BYTES = Math.floor(1.4 * 1024 * 1024);

const DRAFT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export type DraftImage = {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string;
};

/** Accepts up to 3 images. Anything else is rejected so the route can answer 400. */
export function parseDraftImages(raw: unknown): { images: DraftImage[] } | { error: 'bad_images' } {
  if (raw == null) return { images: [] };
  if (!Array.isArray(raw) || raw.length > DRAFT_IMAGE_LIMIT) return { error: 'bad_images' };
  const images: DraftImage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return { error: 'bad_images' };
    const row = item as { mediaType?: unknown; data?: unknown };
    const mediaType = row.mediaType;
    const data = row.data;
    if (typeof mediaType !== 'string' || !DRAFT_IMAGE_TYPES.has(mediaType)) return { error: 'bad_images' };
    if (typeof data !== 'string' || !data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
      return { error: 'bad_images' };
    }
    const bytes = Buffer.from(data, 'base64').length;
    if (bytes < 1 || bytes > DRAFT_IMAGE_BYTES) return { error: 'bad_images' };
    images.push({ mediaType: mediaType as DraftImage['mediaType'], data });
  }
  return { images };
}

/** A screenshot can stand in for the excerpt. Text-only drafts still need 40 characters. */
export function draftExcerptOk(excerpt: string, imageCount: number): boolean {
  return imageCount > 0 || excerpt.trim().length >= 40;
}
