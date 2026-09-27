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

const LARGE_EFFORT = new Set<BriefEffort>(['L', 'XL', 'XXL']);

/** Rush fee is code-owned: due within 48 hours and effort is L or larger. */
export function isRushBrief(dueDate: string, effort: BriefEffort, now = Date.now()): boolean {
  if (!LARGE_EFFORT.has(effort)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return false;
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() - now < 48 * 60 * 60 * 1000;
}

export function isBriefCategory(value: string): value is BriefCategory {
  return (BRIEF_CATEGORIES as readonly string[]).includes(value);
}

export function isBriefEffort(value: string): value is BriefEffort {
  return (BRIEF_EFFORTS as readonly string[]).includes(value);
}
