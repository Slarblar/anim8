/**
 * Finds wording a draft copied from its source. A "run" is a stretch of at least `min` words that appears in both,
 * ignoring case and punctuation. Text inside quotation marks in the draft is skipped: quotes must stay exact.
 */
const QUOTED = /["“”][^"“”]{2,400}["“”]|(?<![A-Za-z])['‘’][^'‘’\n]{8,200}['‘’](?![A-Za-z])/g;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'$%.\s-]/g, ' ')
    .replace(/(?<!\d)\.(?!\d)/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean);
}

export function copiedRuns(source: string, draft: string, min = 7): string[] {
  const src = words(source);
  if (src.length < min) return [];
  const grams = new Set<string>();
  for (let i = 0; i + min <= src.length; i += 1) grams.add(src.slice(i, i + min).join(' '));
  const out: string[] = [];
  for (const part of String(draft || '').split(QUOTED)) {
    const w = words(part);
    let i = 0;
    while (i + min <= w.length) {
      if (!grams.has(w.slice(i, i + min).join(' '))) { i += 1; continue; }
      let end = i + min;
      while (end < w.length && grams.has(w.slice(end - min + 1, end + 1).join(' '))) end += 1;
      out.push(w.slice(i, end).join(' '));
      i = end;
    }
  }
  return out;
}

/** Which draft fields copy the source, with the copied phrases. */
export function copyReport(source: string, fields: Record<string, string>, min = 7): { field: string; phrases: string[] }[] {
  return Object.entries(fields)
    .map(([field, text]) => ({ field, phrases: copiedRuns(source, text, min) }))
    .filter((r) => r.phrases.length);
}
