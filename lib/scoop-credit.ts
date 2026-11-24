/**
 * One credit line, one label.
 * Source is where the information came from. Photo is who owns the image.
 */

const ONE_LABEL = /^(?:source|photo|image|credit)\s*:\s*|^(?:photo\s+by|image\s+credit|courtesy\s+of)\s+/i;
const CREDIT_START = /^(?:source|photo|image|credit)\s*:|^(?:photo\s+by|image\s+credit|courtesy\s+of)\b/i;

export type CreditNames = { infoSource: string; photoCredit: string };
export type CreditLines = { graphicLine: string; captionLine: string };

function tidy(value: unknown): string {
  return String(value ?? '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/^[\s:;,|–—-]+|[\s:;,|–—.-]+$/g, '')
    .trim();
}

/** Strip leading credit labels. Photo credits keep a leading "Courtesy of" when the original had one. */
export function cleanCreditName(value: unknown, kind: 'info' | 'photo' = 'info'): string {
  const original = tidy(value);
  let s = original;
  const courtesy = /(?:^|:\s*)courtesy\s+of\b/i.test(original);
  for (let i = 0; i < 6; i += 1) {
    const next = s.replace(ONE_LABEL, '').trim();
    if (next === s) break;
    s = tidy(next);
  }
  s = tidy(s);
  if (!s) return '';
  if (kind === 'photo' && courtesy) return `Courtesy of ${s}`;
  return s;
}

/** A pasted URL or bare domain becomes the outlet's name. Other words stay as written. */
export function outletName(value: unknown): string {
  const name = cleanCreditName(value);
  const domain = name.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.[a-z]{2,}(?:\/\S*)?$/i);
  if (!domain) return name;
  const host = domain[1];
  return host.length <= 4 ? host.toUpperCase() : host.charAt(0).toUpperCase() + host.slice(1);
}

function sameCredit(a: string, b: string): boolean {
  const left = cleanCreditName(a).toLowerCase();
  const right = cleanCreditName(b).toLowerCase();
  return Boolean(left) && left === right;
}

/** Graphic line and the single credit line used at the end of a caption. */
export function formatCredits(input: Partial<CreditNames> | null | undefined): CreditLines {
  const infoSource = outletName(input?.infoSource ?? '');
  const photoCredit = cleanCreditName(input?.photoCredit ?? '', 'photo');
  if (!infoSource && !photoCredit) return { graphicLine: '', captionLine: '' };
  if (infoSource && photoCredit && sameCredit(infoSource, photoCredit)) {
    const line = `Source: ${infoSource}`;
    return { graphicLine: line, captionLine: line };
  }
  if (infoSource && photoCredit) return { graphicLine: `Photo: ${photoCredit}`, captionLine: `Source: ${infoSource}` };
  if (photoCredit) {
    const line = `Photo: ${photoCredit}`;
    return { graphicLine: line, captionLine: line };
  }
  const line = `Source: ${infoSource}`;
  return { graphicLine: line, captionLine: line };
}

function lineKind(line: string): 'photo' | 'source' | null {
  const labels: boolean[] = [];
  let rest = line.trim();
  for (let i = 0; i < 6; i += 1) {
    const match = ONE_LABEL.exec(rest);
    if (!match) break;
    labels.push(/photo|image|courtesy/i.test(match[0]));
    rest = rest.slice(match[0].length).trim();
  }
  if (!labels.length) return null;
  const photo = labels.slice(1).some(Boolean) || (labels.length === 1 && labels[0]);
  return photo ? 'photo' : 'source';
}

function oneCreditLine(line: string): string {
  const kind = lineKind(line);
  if (!kind) return line;
  const name = cleanCreditName(line, kind === 'photo' ? 'photo' : 'info');
  if (!name) return '';
  return kind === 'photo' ? `Photo: ${name}` : `Source: ${name}`;
}

/**
 * Last guard for free text. A stacked label collapses to the inner one
 * ("Source: Photo: X" becomes "Photo: X"). Two lines for the same name become one Source line.
 */
export function normalizeCreditLine(text: unknown): string {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!CREDIT_START.test(line.trim())) {
      out.push(line);
      continue;
    }
    const next = oneCreditLine(line);
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    const name = cleanCreditName(next).toLowerCase();
    const asSource = `source: ${name}`;
    const asPhoto = `photo: ${name}`;
    if (key.startsWith('photo:') && seen.has(asSource)) continue;
    if (key.startsWith('source:') && seen.has(asPhoto)) {
      const at = out.findIndex((item) => item.toLowerCase() === asPhoto);
      if (at >= 0) out.splice(at, 1);
      seen.delete(asPhoto);
    }
    seen.add(key);
    out.push(next);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Read a legacy "Source:" / "Photo:" / "photo by" string into the two names. */
export function splitLegacyCredit(value: unknown): CreditNames {
  const text = tidy(value);
  if (!text) return { infoSource: '', photoCredit: '' };
  const line = normalizeCreditLine(text);
  if (/^photo\s*:/i.test(line)) return { infoSource: '', photoCredit: cleanCreditName(line, 'photo') };
  if (/^source\s*:/i.test(line)) return { infoSource: outletName(line), photoCredit: '' };
  if (/photo\s+by|courtesy\s+of|image\s+credit|\bphoto\s*:/i.test(text)) {
    return { infoSource: '', photoCredit: cleanCreditName(text, 'photo') };
  }
  return { infoSource: outletName(text), photoCredit: '' };
}

export function readCreditFields(raw: Record<string, unknown> | null | undefined): CreditNames {
  const row = raw && typeof raw === 'object' ? raw : {};
  const fields = row.fields && typeof row.fields === 'object' ? row.fields as Record<string, unknown> : {};
  const slot = Object.entries(fields).find(([key]) => /source|credit|attribution/i.test(key))?.[1];
  let infoSource = outletName(row.infoSource ?? '');
  let photoCredit = cleanCreditName(row.photoCredit ?? '', 'photo');
  const legacy = row.source ?? slot;
  if (legacy != null && String(legacy).trim()) {
    const split = splitLegacyCredit(legacy);
    if (!infoSource) infoSource = split.infoSource;
    if (!photoCredit) photoCredit = split.photoCredit;
  }
  return { infoSource, photoCredit };
}

/** Drop credit lines the model wrote, then add the one caption line. */
export function applyCaptionCredit(text: unknown, captionLine: string): string {
  const kept = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !CREDIT_START.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const body = captionLine ? (kept ? `${kept}\n\n${captionLine}` : captionLine) : kept;
  return normalizeCreditLine(body);
}
