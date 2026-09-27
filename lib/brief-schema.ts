/** Shared brief-builder types and rush rule. Safe to import from client components. */

export const BRIEF_CATEGORIES = [
  'video-edit',
  'podcast-longform-edit',
  'brand-design-assets',
  'print-event-production',
  'social-content',
  'deck-presentation-design',
  'other',
] as const;

export type BriefCategory = (typeof BRIEF_CATEGORIES)[number];

export const BRIEF_EFFORTS = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export type BriefEffort = (typeof BRIEF_EFFORTS)[number];

export const CATEGORY_LABELS: Record<BriefCategory, string> = {
  'video-edit': 'Video edit',
  'podcast-longform-edit': 'Podcast / longform edit',
  'brand-design-assets': 'Brand & design assets',
  'print-event-production': 'Print / event production',
  'social-content': 'Social content',
  'deck-presentation-design': 'Deck / presentation design',
  other: 'Other',
};

export const EFFORT_LABELS: Record<BriefEffort, string> = {
  S: 'S (0.5–2 hrs)',
  M: 'M (2–8 hrs)',
  L: 'L (8–16 hrs)',
  XL: 'XL (16–32 hrs)',
  XXL: 'XXL (4–5 days)',
};

export type BriefIntake = {
  project_type: string;
  description: string;
  due_date: string;
  creative_direction: string;
  reference_links: string[];
  reference_uploads: string[];
};

export type BriefFollowUp = {
  id: string;
  prompt: string;
};

export type BriefAnswer = {
  id: string;
  prompt: string;
  answer: string;
};

export type BriefSubtask = {
  name: string;
  description: string;
};

export type FinalizedBrief = {
  title: string;
  category: BriefCategory;
  deliverables: string[];
  effort: BriefEffort;
  creative_direction: string;
  suggested_subtasks: BriefSubtask[];
};

/** What the client reviews. Effort stays off this object so they cannot set hours. */
export type ClientReviewBrief = Omit<FinalizedBrief, 'effort'>;

const LARGE_EFFORT = new Set<BriefEffort>(['L', 'XL', 'XXL']);

export function isLargeEffort(effort: BriefEffort): boolean {
  return LARGE_EFFORT.has(effort);
}

export function dueWithin48Hours(dueDate: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return false;
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() - now < 48 * 60 * 60 * 1000;
}

/** Rush fee is code-owned: due within 48 hours and effort is L or larger. */
export function isRushBrief(dueDate: string, effort: BriefEffort, now = Date.now()): boolean {
  return isLargeEffort(effort) && dueWithin48Hours(dueDate, now);
}

export function isBriefCategory(value: string): value is BriefCategory {
  return (BRIEF_CATEGORIES as readonly string[]).includes(value);
}

export function isBriefEffort(value: string): value is BriefEffort {
  return (BRIEF_EFFORTS as readonly string[]).includes(value);
}

/** One counted line can become this many piece subtasks. */
const MAX_COUNTED_PIECES = 24;
/** Piece subtasks plus shared setup steps. */
export const MAX_BRIEF_SUBTASKS = 36;

const TIME_UNIT = /^(hours?|days?|weeks?|minutes?|mins?|seconds?|secs?|months?)\b/i;
/** A single "episode 1" / "cutdown 1" step, which a counted set replaces. */
const SINGLE_UNIT = /\b(episode|cutdown|video|reel|post|asset|piece|short)\s*#?\s*0*1\b/i;

function singularizeWord(word: string): string {
  if (/ies$/i.test(word) && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes|ses)$/i.test(word) && word.length > 4) return word.slice(0, -2);
  if (/s$/i.test(word) && !/ss$/i.test(word) && word.length > 3) return word.slice(0, -1);
  return word;
}

function singularizePhrase(phrase: string): string {
  const words = phrase.split(/\s+/);
  const last = words.length - 1;
  words[last] = singularizeWord(words[last]);
  return words.join(' ');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pieceStem(name: string): string | null {
  const match = name.trim().match(/^(.*)\s+\d+$/);
  return match ? match[1].toLowerCase() : null;
}

/** "10 shortform video cutdowns (30-45 sec each)" → ten numbered piece subtasks. */
export function expandCountedDeliverables(deliverables: string[]): BriefSubtask[] {
  const pieces: BriefSubtask[] = [];

  for (const line of deliverables) {
    if (pieces.length >= MAX_COUNTED_PIECES) break;
    const match = line.trim().match(/^(\d{1,2})(?!\s*[-–—])\s+(.+)$/);
    if (!match) continue;

    const count = Number(match[1]);
    if (count < 2 || count > MAX_COUNTED_PIECES) continue;

    let rest = match[2].trim();
    let spec = '';
    const paren = rest.match(/\s*\(([^)]+)\)\s*$/);
    if (paren && paren.index != null) {
      spec = paren[1].trim();
      rest = rest.slice(0, paren.index).trim();
    }
    rest = rest.replace(/[.:;,]+$/, '').trim();
    if (rest.length < 3 || TIME_UNIT.test(rest)) continue;

    const label = capitalize(singularizePhrase(rest));
    for (let i = 1; i <= count && pieces.length < MAX_COUNTED_PIECES; i += 1) {
      pieces.push({
        name: `${label} ${i}`,
        description: spec ? `${spec}. ${i} of ${count}.` : `${i} of ${count}.`,
      });
    }
  }

  return pieces;
}

/**
 * Counted deliverables become one subtask each. Shared setup steps from the
 * model stay, except a lone "episode 1" that stood in for the whole set.
 */
export function assembleBriefSubtasks(deliverables: string[], modelSteps: BriefSubtask[]): BriefSubtask[] {
  const pieces = expandCountedDeliverables(deliverables);
  const stems = new Set(pieces.map((piece) => pieceStem(piece.name)).filter((stem): stem is string => !!stem));

  const setup = modelSteps.filter((step) => {
    const name = step.name.trim();
    if (!name) return false;
    const stem = pieceStem(name);
    if (stem && stems.has(stem)) return false;
    if (pieces.length > 0 && SINGLE_UNIT.test(name)) return false;
    return true;
  });

  const merged: BriefSubtask[] = [];
  const seen = new Set<string>();
  for (const item of [...pieces, ...setup]) {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push({ name: item.name.trim(), description: item.description.trim() });
    if (merged.length >= MAX_BRIEF_SUBTASKS) break;
  }
  return merged;
}
