/**
 * Glossary for text that originates in Asana (or the KPI scoring doc) and
 * shows up on /crew. Asana itself is English-only — we translate at display
 * time so VN speakers aren't stuck reading "Excellent" / "Great (70+)".
 */

export type LocalizedPair = { en: string; vn: string };

/** Quality / Collaboration Rating enum options from the 🐸 Anim8 KPI project. */
export const ASANA_RATING_LABELS: Record<string, LocalizedPair> = {
  '5 - Excellent': { en: 'Excellent', vn: 'Xuất sắc' },
  '4 - Very Good': { en: 'Very Good', vn: 'Rất tốt' },
  '3 - Good': { en: 'Good', vn: 'Tốt' },
  '2 - Fair': { en: 'Fair', vn: 'Khá' },
  '1 - Poor': { en: 'Poor', vn: 'Yếu' },
};

/** Performance bands from Anim8 KPI Scoring Documentation 2026 v2 §1. */
export const PERFORMANCE_BAND_LABELS: Record<string, LocalizedPair> = {
  great: { en: 'Great', vn: 'Xuất sắc' },
  good: { en: 'Good', vn: 'Tốt' },
  average: { en: 'Average', vn: 'Trung bình' },
  bad: { en: 'Bad', vn: 'Yếu' },
  poor: { en: 'Poor', vn: 'Kém' },
};

/** Band legend lines (with score ranges) for the charts. */
export const PERFORMANCE_BAND_LEGEND: Record<string, LocalizedPair> = {
  great: { en: 'Great (70+)', vn: 'Xuất sắc (70+)' },
  good: { en: 'Good (55–69.9)', vn: 'Tốt (55–69.9)' },
  average: { en: 'Average (40–54.9)', vn: 'Trung bình (40–54.9)' },
  bad: { en: 'Bad (25–39.9)', vn: 'Yếu (25–39.9)' },
  poor: { en: 'Poor (<25)', vn: 'Kém (<25)' },
};

export function localizeAsanaRating(
  rating: string,
  lang: 'en' | 'vn'
): { primary: string; other: string; known: boolean } {
  const pair = ASANA_RATING_LABELS[rating];
  if (!pair) {
    // Unknown Asana option — strip the leading "N - " and show as-is.
    const stripped = rating.replace(/^\d+\s*-\s*/, '');
    return { primary: stripped, other: stripped, known: false };
  }
  return {
    primary: lang === 'vn' ? pair.vn : pair.en,
    other: lang === 'vn' ? pair.en : pair.vn,
    known: true,
  };
}

export function localizePerformanceBand(
  bandKey: string,
  lang: 'en' | 'vn',
  withRange = false
): { primary: string; other: string } {
  const map = withRange ? PERFORMANCE_BAND_LEGEND : PERFORMANCE_BAND_LABELS;
  const pair = map[bandKey] ?? { en: bandKey, vn: bandKey };
  return {
    primary: lang === 'vn' ? pair.vn : pair.en,
    other: lang === 'vn' ? pair.en : pair.vn,
  };
}
