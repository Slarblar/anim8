import { describe, expect, it } from 'vitest';
import { cleanCreditName, formatCredits, normalizeCreditLine, splitLegacyCredit } from './scoop-credit';

describe('credit lines', () => {
  it('collapses a stacked photo label', () => {
    expect(normalizeCreditLine('Source: Photo: Romy Colvin')).toBe('Photo: Romy Colvin');
  });

  it('uses Photo on the graphic and the caption when only a photographer is known', () => {
    expect(formatCredits({ infoSource: '', photoCredit: 'Romy Colvin' })).toEqual({
      graphicLine: 'Photo: Romy Colvin',
      captionLine: 'Photo: Romy Colvin',
    });
  });

  it('puts the photographer on the graphic and the outlet on the caption', () => {
    expect(formatCredits({ infoSource: 'KSL', photoCredit: 'Romy Colvin' })).toEqual({
      graphicLine: 'Photo: Romy Colvin',
      captionLine: 'Source: KSL',
    });
  });

  it('uses Source once when the outlet and the photographer are the same', () => {
    const lines = formatCredits({ infoSource: 'KSL', photoCredit: 'ksl' });
    expect(lines).toEqual({ graphicLine: 'Source: KSL', captionLine: 'Source: KSL' });
  });

  it('adds nothing when neither credit is known', () => {
    expect(formatCredits({ infoSource: '', photoCredit: '' })).toEqual({ graphicLine: '', captionLine: '' });
  });

  it('strips repeated labels and keeps the name', () => {
    expect(splitLegacyCredit('photo by Jane Doe').photoCredit).toBe('Jane Doe');
    expect(cleanCreditName('photo by Jane Doe')).toBe('Jane Doe');
    expect(normalizeCreditLine('Source: source: KUTV')).toBe('Source: KUTV');
  });

  it('never leaves Source and Photo on the same caption line', () => {
    const samples = [
      normalizeCreditLine('Source: Photo: Romy Colvin'),
      normalizeCreditLine('Photo: Source: KSL'),
      normalizeCreditLine('Source: Photo by Jane Doe'),
      `The road is closed.\n\n${formatCredits({ infoSource: 'KSL', photoCredit: 'Romy Colvin' }).captionLine}`,
      formatCredits({ infoSource: 'KSL', photoCredit: 'Romy Colvin' }).graphicLine,
    ];
    for (const sample of samples) {
      for (const line of sample.split('\n')) {
        expect(/source\s*:/i.test(line) && /photo\s*:/i.test(line)).toBe(false);
      }
    }
  });
});
