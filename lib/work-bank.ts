/** Studio work used as brief-builder inspiration. Shared by admin and the client session. */

export const WORK_TAGS = [
  { id: 'video', label: 'Video' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'product-design', label: 'Product design' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'editing', label: 'Editing' },
  { id: 'vfx', label: 'VFX' },
  { id: 'animation', label: 'Animation' },
  { id: 'modeling', label: 'Modeling' },
  { id: 'materials', label: 'Materials' },
  { id: 'textures', label: 'Textures' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'typography', label: 'Typography' },
  { id: 'design', label: 'Design' },
] as const;

export type WorkTag = (typeof WORK_TAGS)[number]['id'];

const TAG_IDS = new Set<string>(WORK_TAGS.map((tag) => tag.id));

export type WorkPiece = {
  id: string;
  title: string;
  client: string;
  year: string;
  imageUrl: string;
  gumletUrl: string;
  tags: WorkTag[];
  /** Optional client-facing line, like "1M+ views". Empty when unset. */
  stat: string;
  createdAt: string;
  updatedAt: string;
};

/** What the brief builder needs. Timestamps stay on the admin record. */
export type InspoPiece = {
  id: string;
  title: string;
  client: string;
  year: string;
  imageUrl: string;
  gumletUrl: string;
  tags: WorkTag[];
  /** Optional client-facing line, like "1M+ views". */
  stat?: string;
  /** Crop for the built-in stills. Uploads use the default center crop. */
  position?: string;
};

export type WorkInput = {
  title: string;
  client: string;
  year: string;
  imageUrl: string;
  gumletUrl: string;
  tags: WorkTag[];
  stat: string;
};

/** Service → tags that should show up more often for that discipline. */
export const SERVICE_INSPO_TAGS: Record<string, WorkTag[]> = {
  video: ['editing', 'video', 'vfx'],
  graphic: ['graphics', 'design', 'typography', 'product-design'],
  animation: ['animation', 'modeling', 'materials', 'textures', 'vfx'],
  brand: ['design', 'typography', 'concepts', 'lifestyle'],
  ip: ['concepts', 'modeling', 'animation'],
};

/** Category → tags that should show up most often once a format is chosen. */
const CATEGORY_INSPO_TAGS: Record<string, WorkTag[]> = {
  'video:social': ['editing', 'video'],
  'video:ads': ['editing', 'video'],
  'video:podcast': ['editing', 'video'],
  'video:longform': ['editing', 'video'],
  'video:event': ['editing', 'video', 'lifestyle'],
  'video:versions': ['editing', 'video'],
  'graphic:social': ['graphics', 'design'],
  'graphic:ads': ['graphics', 'design'],
  'graphic:deck': ['design', 'typography'],
  'graphic:print': ['graphics', 'design'],
  'graphic:packaging': ['product-design', 'design'],
  'graphic:digital': ['graphics', 'design'],
  'animation:product': ['animation', 'product-design', 'modeling'],
  'animation:character': ['animation', 'modeling'],
  'animation:explainer': ['animation'],
  'animation:environment': ['animation', 'textures', 'materials', 'concepts'],
  'animation:vfx': ['vfx', 'animation'],
  'animation:loop': ['animation'],
  'brand:identity': ['design', 'typography', 'concepts'],
  'brand:refresh': ['design', 'typography'],
  'brand:logo': ['typography', 'design'],
  'brand:guidelines': ['design', 'typography'],
  'brand:rollout': ['design', 'graphics', 'lifestyle'],
  'ip:character': ['concepts', 'modeling', 'animation'],
  'ip:world': ['concepts', 'animation', 'textures'],
  'ip:story': ['concepts', 'animation'],
  'ip:bible': ['concepts', 'design', 'typography'],
  'ip:existing': ['concepts', 'modeling', 'animation'],
};

const CATEGORY_TAG_WEIGHT = 8;
const SERVICE_TAG_WEIGHT = 3;

export function workTagLabel(id: string): string {
  return WORK_TAGS.find((tag) => tag.id === id)?.label ?? id;
}

export function isWorkTag(value: string): value is WorkTag {
  return TAG_IDS.has(value);
}

export function gumletIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'play.gumlet.io' && host !== 'video.gumlet.io' && !host.endsWith('.gumlet.io')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const embed = parts.indexOf('embed');
    const candidate = embed >= 0 ? parts[embed + 1] : parts[parts.length - 1];
    return candidate && /^[a-zA-Z0-9]+$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function pieceStill(piece: Pick<InspoPiece, 'imageUrl' | 'gumletUrl'>): string {
  if (piece.imageUrl) return piece.imageUrl;
  const id = gumletIdFromUrl(piece.gumletUrl);
  return id ? `/api/thumb?id=${encodeURIComponent(id)}` : '';
}

/** Studio samples only. Local stand-in stills are never part of the canvas. */
export function isStudioPiece(piece: InspoPiece): boolean {
  const still = pieceStill(piece);
  if (!still || still.startsWith('/brief-session/')) return false;
  return true;
}

export function pieceCaption(piece: Pick<InspoPiece, 'client' | 'year'>): string {
  return [piece.client, piece.year].filter(Boolean).join(' · ');
}

function isBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function parseWorkInput(raw: unknown): WorkInput | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid request.' };
  const body = raw as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const client = typeof body.client === 'string' ? body.client.trim() : '';
  const year = typeof body.year === 'string' ? body.year.trim() : '';
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  const gumletUrl = typeof body.gumletUrl === 'string' ? body.gumletUrl.trim() : '';
  const stat = typeof body.stat === 'string' ? body.stat.replace(/\s+/g, ' ').trim() : '';
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.filter((tag): tag is WorkTag => typeof tag === 'string' && isWorkTag(tag)))]
    : [];

  if (!title || title.length > 120) return { error: 'Add a project title (120 characters or fewer).' };
  if (client.length > 80) return { error: 'Client name is too long.' };
  if (year.length > 16) return { error: 'Year should be a short label, like 2025.' };
  if (stat.length > 32) return { error: 'Keep the stat short, like 1M+ views.' };
  if (imageUrl && !isBlobUrl(imageUrl)) return { error: 'Upload the still through this page.' };
  if (gumletUrl && !gumletIdFromUrl(gumletUrl)) {
    return { error: 'Paste a Gumlet link or video id.' };
  }
  if (!imageUrl && !gumletUrl) return { error: 'Add a still, a Gumlet link, or both.' };
  if (!tags.length) return { error: 'Pick at least one tag.' };

  return { title, client, year, imageUrl, gumletUrl, tags, stat };
}

export function toInspoPiece(piece: WorkPiece): InspoPiece {
  return {
    id: piece.id,
    title: piece.title,
    client: piece.client,
    year: piece.year,
    imageUrl: piece.imageUrl,
    gumletUrl: piece.gumletUrl,
    tags: piece.tags,
    stat: piece.stat,
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mixSeed(seed: number, key: string): number {
  let hash = seed >>> 0 || 1;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  }
  return hash || 1;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  const random = mulberry32(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

function weightedSample(
  pieces: InspoPiece[],
  weightOf: (piece: InspoPiece) => number,
  limit: number,
  seed: number
): InspoPiece[] {
  const random = mulberry32(seed);
  const pool = pieces.map((piece) => ({ piece, weight: Math.max(0, weightOf(piece)) }));
  const picked: InspoPiece[] = [];
  const take = Math.max(0, limit);
  while (picked.length < take && pool.length) {
    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    let index = total <= 0 ? Math.floor(random() * pool.length) : 0;
    if (total > 0) {
      let mark = random() * total;
      for (; index < pool.length; index++) {
        mark -= pool[index].weight;
        if (mark <= 0) break;
      }
      if (index >= pool.length) index = pool.length - 1;
    }
    picked.push(pool.splice(index, 1)[0].piece);
  }
  return picked;
}

/** A fair sample of the bank. An empty tag list uses every piece. */
export function piecesForTags(pieces: InspoPiece[], tags: WorkTag[], limit: number, seed: number): InspoPiece[] {
  const matched = tags.length ? pieces.filter((piece) => piece.tags.some((tag) => tags.includes(tag))) : pieces;
  const pool = matched.length ? matched : pieces;
  return shuffle(pool, seed).slice(0, Math.max(0, limit));
}

/**
 * Work-bank pieces only. A tag linked to the chosen category is drawn most often,
 * a tag linked to the service next, and the rest of the bank only fills the gaps.
 */
export function piecesForRequest(
  pieces: InspoPiece[],
  serviceId: string,
  categoryId: string,
  limit: number,
  seed: number
): InspoPiece[] {
  const categoryTags = CATEGORY_INSPO_TAGS[`${serviceId}:${categoryId}`] ?? [];
  const serviceTags = SERVICE_INSPO_TAGS[serviceId] ?? [];
  return weightedSample(
    pieces,
    (piece) => {
      let weight = 1;
      for (const tag of piece.tags) {
        if (categoryTags.includes(tag)) weight += CATEGORY_TAG_WEIGHT;
        else if (serviceTags.includes(tag)) weight += SERVICE_TAG_WEIGHT;
      }
      return weight;
    },
    limit,
    seed
  );
}
