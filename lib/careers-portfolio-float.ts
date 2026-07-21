import { GLOBE_PORTFOLIO_ITEMS, type GlobePortfolioItem } from '@/lib/globe-portfolio-items'

export type FloatCardFormat = 'landscape' | 'portrait'

export interface PortfolioFloatCard {
  key: string
  src: string
  format: FloatCardFormat
}

/** @deprecated alias — same shape as `PortfolioFloatCard` */
export type CareersFloatCard = PortfolioFloatCard

const MAX_CAREERS_FLOAT_CARDS = 6

function itemThumbSrc(item: GlobePortfolioItem): string | null {
  const gallery0 = item.galleryImages?.[0]
  if (gallery0) return gallery0
  if (item.gumletId) return `/api/thumb?id=${item.gumletId}`
  return null
}

function itemKey(item: GlobePortfolioItem): string {
  const slug = `${item.label}-${item.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'portfolio-item'
}

function itemToFloatCard(item: GlobePortfolioItem): PortfolioFloatCard | null {
  const src = itemThumbSrc(item)
  if (!src) return null
  return { key: itemKey(item), src, format: item.format }
}

/** Every globe portfolio entry that has a thumbnail — same source as home `GlobeWork`. */
export function getAllPortfolioFloatCards(): PortfolioFloatCard[] {
  const seen = new Set<string>()
  const out: PortfolioFloatCard[] = []
  for (const item of GLOBE_PORTFOLIO_ITEMS) {
    const card = itemToFloatCard(item)
    if (!card || seen.has(card.key)) continue
    seen.add(card.key)
    out.push(card)
  }
  return out
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic shuffle — stable for a given seed (e.g. client slug). */
export function pickPortfolioFloatCards(count: number, seed: string): PortfolioFloatCard[] {
  const pool = getAllPortfolioFloatCards()
  if (pool.length === 0) return []
  if (pool.length <= count) return pool

  const rng = mulberry32(hashSeed(seed))
  const picked = pool.slice()
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked.slice(0, count)
}

/** Careers page — first six with thumbnails (fixed order). */
export function getCareersFloatCards(): PortfolioFloatCard[] {
  const seen = new Set<string>()
  const out: PortfolioFloatCard[] = []
  for (const item of GLOBE_PORTFOLIO_ITEMS) {
    const card = itemToFloatCard(item)
    if (!card || seen.has(card.key)) continue
    seen.add(card.key)
    out.push(card)
    if (out.length >= MAX_CAREERS_FLOAT_CARDS) break
  }
  return out
}

export const CAREERS_FLOAT_CARDS: PortfolioFloatCard[] = getCareersFloatCards()

export const CAREERS_FLOAT_POSITIONS: { side: 'left' | 'right'; edge: number; top: number }[] = [
  { side: 'left', edge: 2.75, top: 10 },
  { side: 'right', edge: 2.75, top: 24 },
  { side: 'left', edge: 3.25, top: 40 },
  { side: 'right', edge: 3.25, top: 54 },
  { side: 'left', edge: 2.5, top: 68 },
  { side: 'right', edge: 2.5, top: 82 },
]
