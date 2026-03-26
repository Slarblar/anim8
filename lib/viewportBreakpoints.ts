/**
 * Viewport tiers for responsive globe modal and landing layout.
 * Breakpoints align with `app/page.css` globe-modal media queries.
 */
export type ViewportTier =
  | 'mobile'
  | 'largeMobile'
  | 'tablet'
  | 'largeTablet'
  | 'smallDesktop'
  | 'desktop'
  | 'large'

/** Min width (px) at which each tier begins (mobile is everything below largeMobile). */
export const VIEWPORT_MIN = {
  largeMobile: 480,
  tablet: 600,
  largeTablet: 768,
  smallDesktop: 1024,
  desktop: 1280,
  large: 1536,
} as const

export function getViewportTier(width: number): ViewportTier {
  if (width < VIEWPORT_MIN.largeMobile) return 'mobile'
  if (width < VIEWPORT_MIN.tablet) return 'largeMobile'
  if (width < VIEWPORT_MIN.largeTablet) return 'tablet'
  if (width < VIEWPORT_MIN.smallDesktop) return 'largeTablet'
  if (width < VIEWPORT_MIN.desktop) return 'smallDesktop'
  if (width < VIEWPORT_MIN.large) return 'desktop'
  return 'large'
}

/** Portrait modal uses horizontal split (media | copy) at tablet and up. */
export function globeModalPortraitSplitLayout(width: number): boolean {
  return width >= VIEWPORT_MIN.tablet
}

/**
 * Inline layout for Gumlet iframe wrapper — CSS handles most sizing; this caps height per tier
 * where the embed needs explicit bounds.
 */
export function setGlobeModalVideoWrapStyles(
  el: HTMLElement,
  innerWidth: number,
  innerHeight: number,
  isPortrait: boolean,
): void {
  const tier = getViewportTier(innerWidth)
  el.style.aspectRatio = isPortrait ? '9 / 16' : '16 / 9'

  if (isPortrait) {
    if (globeModalPortraitSplitLayout(innerWidth)) {
      el.style.width = ''
      el.style.maxHeight = ''
      return
    }
    el.style.width = '100%'
    const vhCap: Record<ViewportTier, number> = {
      mobile: 0.5,
      largeMobile: 0.54,
      tablet: 0.52,
      largeTablet: 0.52,
      smallDesktop: 0.52,
      desktop: 0.52,
      large: 0.52,
    }
    el.style.maxHeight = `${Math.round(innerHeight * vhCap[tier])}px`
    return
  }

  el.style.width = '100%'
  const vhCap: Record<ViewportTier, number> = {
    mobile: 0.34,
    largeMobile: 0.38,
    tablet: 0.42,
    largeTablet: 0.46,
    smallDesktop: 0.5,
    desktop: 0.54,
    large: 0.58,
  }
  el.style.maxHeight = `${Math.round(innerHeight * vhCap[tier])}px`
}

/** Pixel size for the abstract canvas fallback inside the modal. */
export function getGlobeModalAbstractCanvasSize(
  innerWidth: number,
  innerHeight: number,
  format: 'landscape' | 'portrait',
): { W: number; H: number } {
  const tier = getViewportTier(innerWidth)
  const split = globeModalPortraitSplitLayout(innerWidth)

  if (format === 'portrait') {
    if (split) {
      const maxHByTier: Record<ViewportTier, number> = {
        mobile: 400,
        largeMobile: 400,
        tablet: 400,
        largeTablet: 440,
        smallDesktop: 460,
        desktop: 500,
        large: 520,
      }
      const H = Math.round(Math.min(innerHeight * 0.6, maxHByTier[tier]))
      const W = Math.round(H * (9 / 16))
      return { W, H }
    }
    const wFrac: Record<ViewportTier, number> = {
      mobile: 0.9,
      largeMobile: 0.88,
      tablet: 0.86,
      largeTablet: 0.84,
      smallDesktop: 0.82,
      desktop: 0.8,
      large: 0.78,
    }
    let W = Math.round(innerWidth * wFrac[tier])
    let H = Math.round(W * (16 / 9))
    const maxH = Math.round(innerHeight * (tier === 'mobile' ? 0.52 : 0.56))
    if (H > maxH) {
      H = maxH
      W = Math.round(H * (9 / 16))
    }
    return { W, H }
  }

  const maxWByTier: Record<ViewportTier, number> = {
    mobile: Math.min(560, Math.round(innerWidth * 0.94)),
    largeMobile: Math.min(580, Math.round(innerWidth * 0.92)),
    tablet: Math.min(620, Math.round(innerWidth * 0.9)),
    largeTablet: 660,
    smallDesktop: 700,
    desktop: 760,
    large: 820,
  }
  const W = maxWByTier[tier]
  const H = Math.round(W * (9 / 16))
  return { W, H }
}
