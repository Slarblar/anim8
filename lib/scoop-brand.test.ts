import { describe, expect, it } from 'vitest';
import { normalizeDraft, tagsLine } from '@/lib/scoop-brand';

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
  it('keeps the recommended tags and stops the line at four', () => {
    const draft = normalizeDraft({
      category: 'NEWS',
      tags: 'Utah | Public Safety | Courts | Housing | Elections | SLCSCOOP',
      headlines: [{ lines: ['CITY DENIES THE CLAIM'] }],
      dek: 'A sentence.',
    }, { categories: brand.categories, tags: ['UTAH', 'PUBLIC SAFETY', 'COURTS', 'HOUSING', 'ELECTIONS'] }, {}, []);
    expect(draft.topicTags).toEqual(['UTAH', 'PUBLIC SAFETY', 'COURTS']);
    expect(tagsLine(draft.topicTags)).toBe('UTAH  |  PUBLIC SAFETY  |  COURTS  |  SLCSCOOP');
  });
});
