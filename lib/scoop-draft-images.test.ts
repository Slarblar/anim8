import { describe, expect, it } from 'vitest';
import { DRAFT_IMAGE_BYTES, DRAFT_IMAGE_LIMIT, draftExcerptOk, parseDraftImages } from './scoop-draft-images';

const jpeg = Buffer.from('hello').toString('base64');

function image(mediaType: string, data = jpeg) {
  return { mediaType, data };
}

describe('parseDraftImages', () => {
  it('accepts jpeg, png, webp, and gif, and treats a missing list as none', () => {
    expect(parseDraftImages(undefined)).toEqual({ images: [] });
    const parsed = parseDraftImages(['image/jpeg', 'image/png', 'image/webp'].map((mediaType) => image(mediaType)).concat([image('image/gif')]).slice(0, DRAFT_IMAGE_LIMIT));
    expect(parsed).toEqual({
      images: [
        { mediaType: 'image/jpeg', data: jpeg },
        { mediaType: 'image/png', data: jpeg },
        { mediaType: 'image/webp', data: jpeg },
      ],
    });
    expect(parseDraftImages([image('image/gif')])).toEqual({ images: [{ mediaType: 'image/gif', data: jpeg }] });
  });

  it('rejects a fourth image, a disallowed type, and a payload over 1.4 MB', () => {
    expect(parseDraftImages([image('image/jpeg'), image('image/jpeg'), image('image/jpeg'), image('image/jpeg')])).toEqual({ error: 'bad_images' });
    expect(parseDraftImages([image('image/svg+xml')])).toEqual({ error: 'bad_images' });
    expect(parseDraftImages('nope')).toEqual({ error: 'bad_images' });
    expect(parseDraftImages([{ mediaType: 'image/jpeg', data: 'data:image/jpeg;base64,' + jpeg }])).toEqual({ error: 'bad_images' });
    expect(parseDraftImages([{ mediaType: 'image/jpeg', data: Buffer.alloc(DRAFT_IMAGE_BYTES).toString('base64') }])).toEqual({
      images: [{ mediaType: 'image/jpeg', data: Buffer.alloc(DRAFT_IMAGE_BYTES).toString('base64') }],
    });
    expect(parseDraftImages([{ mediaType: 'image/jpeg', data: Buffer.alloc(DRAFT_IMAGE_BYTES + 1).toString('base64') }])).toEqual({ error: 'bad_images' });
  });
});

describe('draftExcerptOk', () => {
  it('allows a missing excerpt only when a screenshot is attached', () => {
    expect(draftExcerptOk('', 0)).toBe(false);
    expect(draftExcerptOk('too short', 0)).toBe(false);
    expect(draftExcerptOk('x'.repeat(40), 0)).toBe(true);
    expect(draftExcerptOk('', 1)).toBe(true);
    expect(draftExcerptOk('hi', 1)).toBe(true);
  });
});
