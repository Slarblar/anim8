import { describe, expect, it } from 'vitest';
import { normalizeDraft } from '@/lib/scoop-brand';

const brand = { categories: [{ id: 'NEWS', description: 'News', when: 'A news story' }], tags: ['UTAH'] };

describe('headline lines', () => {
  it('keeps each line to 23 characters and at most 3 lines', () => {
    const draft = normalizeDraft({
      category: 'NEWS',
      headlines: [{ lines: ['CITY DENIES THE CLAIM AFTER 111 DAYS AT WORK AND THEN SOME MORE'] }],
      dek: 'A sentence.',
    }, brand, {}, []);
    const lines = draft.headlines[0].lines;
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.every((line) => line.length <= 23)).toBe(true);
    expect(lines[0]).toBe('CITY DENIES THE CLAIM');
  });
});
