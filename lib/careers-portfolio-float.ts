import { GLOBE_PORTFOLIO_ITEMS, type GlobePortfolioItem } from '@/lib/globe-portfolio-items'

export type FloatCardFormat = 'landscape' | 'portrait'

export interface CareersFloatCard {
  key: string
  src: string
  format: FloatCardFormat
}

const MAX_FLOAT_CARDS = 6

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

/**
 * Up to six unique globe portfolio entries that have a thumbnail (Gumlet proxy or first gallery image).
 * Order follows `GLOBE_PORTFOLIO_ITEMS` — edit that file only to change both globe and careers float.
 */
export function getCareersFloatCards(): CareersFloatCard[] {
  const seen = new Set<string>()
  const out: CareersFloatCard[] = []
  for (const item of GLOBE_PORTFOLIO_ITEMS) {
    const src = itemThumbSrc(item)
    if (!src) continue
    const key = itemKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ key, src, format: item.format })
    if (out.length >= MAX_FLOAT_CARDS) break
  }
  return out
}

export const CAREERS_FLOAT_CARDS: CareersFloatCard[] = getCareersFloatCards()

/**
 * Six staggered edge slots (3 left / 3 right) with vertical spacing so cards don’t stack on typical viewports.
 */
export const CAREERS_FLOAT_POSITIONS: { side: 'left' | 'right'; edge: number; top: number }[] = [
  { side: 'left', edge: 2.75, top: 10 },
  { side: 'right', edge: 2.75, top: 24 },
  { side: 'left', edge: 3.25, top: 40 },
  { side: 'right', edge: 3.25, top: 54 },
  { side: 'left', edge: 2.5, top: 68 },
  { side: 'right', edge: 2.5, top: 82 },
]
