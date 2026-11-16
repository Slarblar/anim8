import { describe, expect, it } from 'vitest';
import { parseModelJson } from '@/lib/scoop-json';
import { cleanArticleText } from '@/lib/scoop-link';

describe('parseModelJson', () => {
  it('keeps a pretty-printed reply', () => {
    const text = 'Here is the post:\n{\n  "category": "NEWS",\n  "dek": "One sentence."\n}\n';
    expect(parseModelJson(text)).toEqual({ category: 'NEWS', dek: 'One sentence.' });
  });

  it('accepts a raw line break inside a string', () => {
    const text = '{"article":"A child called 911.\n\nThe crash was near Logan.","headlines":[{"lines":["CHILD CALLS 911","AFTER UTV CRASH"]}]}';
    const out = parseModelJson(text);
    expect(out.article).toBe('A child called 911.\n\nThe crash was near Logan.');
    expect(out.headlines).toEqual([{ lines: ['CHILD CALLS 911', 'AFTER UTV CRASH'] }]);
  });

  it('keeps an escaped quote and drops other control characters inside a string', () => {
    const text = '{"dek":"She said \\"stop\\".\nNext line.\u0001"}';
    expect(parseModelJson(text).dek).toBe('She said "stop".\nNext line.');
  });
});

describe('cleanArticleText', () => {
  it('drops a leading block of page tags and keeps the article', () => {
    const dumped = [
      '---',
      'canonical: https://kutv.com/news/local/example',
      'meta-article:author: Jonathan May, KUTV',
      'meta-description: KUTV CBS 2 provides local news.',
      '',
      'A 9-year-old called 911 after a UTV crash near Logan left a woman with serious injuries. Deputies have not named her.',
    ].join('\n');
    const text = cleanArticleText(dumped);
    expect(text.startsWith('A 9-year-old')).toBe(true);
    expect(text).not.toContain('canonical:');
    expect(text).not.toContain('meta-article');
  });
});