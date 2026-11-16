import { describe, expect, it } from 'vitest';
import { headlineGuide, normalizeDraft, tagsLine } from '@/lib/scoop-brand';

const brand = { categories: [{ id: 'NEWS', description: 'News', when: 'A news story' }], tags: ['UTAH'] };

describe('headline lines', () => {
  it('reads header size from the layout references', () => {
    const guide = headlineGuide([
      { measure: { headline: { capHeight: 58, lineCount: 3, charsPerLine: [15, 22, 22] } } },
      { measure: { headline: { capHeight: 54, lineCount: 3, charsPerLine: [24, 16, 17] } } },
      { measure: { headline: { capHeight: 54, lineCount: 3, charsPerLine: [24, 23, 19] } } },
    ]);
    expect(guide).toEqual({ perLine: 24, lines: 3, cap: 54 });
  });
  it('keeps each line to a full reference line and at most 3 lines', () => {
    const draft = normalizeDraft({
      category: 'NEWS',
      headlines: [{ lines: ['CITY DENIES THE CLAIM AFTER 111 DAYS AT WORK AND THEN SOME MORE'] }],
      dek: 'A sentence.',
    }, brand, {}, []);
    const lines = draft.headlines[0].lines;
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.every((line) => line.length <= 24)).toBe(true);
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
