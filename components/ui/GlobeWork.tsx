'use client'

import { useEffect, useRef, useState } from 'react'
import type * as THREEType from 'three'
import { getGlobeModalAbstractCanvasSize, setGlobeModalVideoWrapStyles } from '@/lib/viewportBreakpoints'
import { GlobeWorkModal, type GlobeWorkGalleryState } from './GlobeWorkModal'

interface GlobeItem {
  format: 'landscape' | 'portrait'
  label: string
  title: string
  accent: string
  style: number
  desc: string
  gumletId?: string
  /** When set, used as the embed query string instead of {@link GUMLET_EMBED} defaults */
  gumletEmbedQuery?: string
  /**
   * Public URLs under `/` (e.g. `/globe-gallery/phin/01.jpg`). When non-empty, the modal opens
   * an image carousel (zoom / pan / next) instead of Gumlet or the abstract canvas.
   */
  galleryImages?: string[]
}

// Proxy route — serves the thumbnail from same origin, bypassing CDN CORS restrictions
const GUMLET_THUMB = (id: string) => `/api/thumb?id=${id}`
const GUMLET_EMBED = (id: string) =>
  `https://play.gumlet.io/embed/${id}?autoplay=true&loop=false&primary_color=7cc142&start_high_res=true`

const ITEMS: GlobeItem[] = [
  { format: 'landscape', label: 'SAO HOUSE',   title: 'Character Universe',      accent: '#7cc142', style: 0, gumletId: '69c31bf3bf49c9eb69baf7fc', desc: 'A coffee shop as the origin story. We build the characters, the world, and the content ecosystem that makes people care before they ever walk through the door.' },
  { format: 'landscape', label: 'VEEFRIENDS',  title: '3D Character Production', accent: '#dd0b83', style: 1, gumletId: '69c3ac9fb365493ac0528b0e', desc: 'Models, rigs, and animation for Gary Vee\'s VeeFriends — production 3D character work delivered for the IP and their pipeline.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Song Reel',               accent: '#7cc142', style: 4, desc: 'Vertical social content for the Sao House universe. Song debut reel — character animation designed natively for the Instagram feed.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Social Content',          accent: '#7cc142', style: 4, gumletId: '69c4d7a0e018a8d7035c5451', gumletEmbedQuery: 'background=false&autoplay=false&loop=false&disable_player_controls=false', desc: 'Modeling, animation, sound design, rigging, lighting, concepting, and storyboarding — vertical social for the Sao House universe.' },
  { format: 'landscape', label: 'GALA GAMES',  title: 'Superior Trailer', accent: '#e8b84a', style: 2, gumletId: '69c4ef26123b739cbbcb723a', gumletEmbedQuery: 'background=false&autoplay=false&loop=false&disable_player_controls=false', desc: 'Creative direction on Gala Games\' Superior trailer from our founder\'s prior studio — he brought Gala in, directed the cinematic; his team cut the trailer using Gala Games production assets.' },
  { format: 'portrait',  label: 'MOTION',      title: 'Social Content',          accent: '#38c2d6', style: 0, desc: 'Vertical-first content production — character animation, environment renders, and brand storytelling built natively for the feed.' },
  { format: 'landscape', label: 'NBC UNIVERSAL', title: 'Battlestar Galactica', accent: '#4a9eff', style: 3, gumletId: '69c45886e018a8d70352774c', desc: 'Trailer direction for NBC Universal\'s Battlestar Galactica — produced under our prior studio, kept in the reel as the benchmark for how we pace mythic IP and shape a franchise-level cut.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Kiiboh Reveal',           accent: '#38c2d6', style: 1, desc: 'Character reveal reel for Kiiboh — the lo-fi robot companion of the Sao House universe. Designed for small-screen impact.' },
  { format: 'landscape', label: 'ORIGINAL CHARACTER', title: 'Concept, 3D Design & Sculpt', accent: '#dd0b83', style: 0, gumletId: '69c47349b365493ac0669441', desc: 'Internal IP — concept, 3D design, and sculpt built in-house from first sketch through production-ready character.' },
  { format: 'portrait',  label: 'SAO HOUSE',   title: 'Song Character',          accent: '#7cc142', style: 2, gumletId: '69c4c489b365493ac06caa63', desc: 'Sao House song character — sculpt, materials, textures, and rig. Production 3D built in-house for the universe’s vertical social cuts.' },
  { format: 'portrait',  label: 'SLCSCOOP',    title: 'Mascot',                  accent: '#38c2d6', style: 3, gumletId: '69c4d24a123b739cbbc8cfa9', desc: 'Mascot for SLCSCOOP — sculpt and rig for a character built to travel in viral vertical content. Delivered for their social-first media drops and shareable IP moments.' },
  {
    format: 'landscape',
    label: 'INSOMNIAC × RNBW',
    title: 'Strategic Cobrand',
    accent: '#c653e7',
    style: 1,
    galleryImages: [
      '/globe-gallery/insomniac-x-edc/packaging-1.webp',
      '/globe-gallery/insomniac-x-edc/packaging-2.webp',
      '/globe-gallery/insomniac-x-edc/packaging-3.webp',
      '/globe-gallery/insomniac-x-edc/packaging-4.webp',
      '/globe-gallery/insomniac-x-edc/packaging-5.webp',
      '/globe-gallery/insomniac-x-edc/packaging-6.webp',
      '/globe-gallery/insomniac-x-edc/packaging-7.webp',
      '/globe-gallery/insomniac-x-edc/packaging-8.webp',
      '/globe-gallery/insomniac-x-edc/packaging-9.webp',
      '/globe-gallery/insomniac-x-edc/packaging-10.webp',
    ],
    desc: 'Graphic design and strategic cobrand for Insomniac\'s EDC and RNBW — a forward-looking vape collaboration built to debut across EDC festivals in 2026. We framed the partnership, shaped the narrative, and executed the full visual system and rollout.',
  },
  { format: 'landscape', label: '3D MODELING', title: 'Asset Production',        accent: '#38c2d6', style: 3, desc: 'ZBrush sculpting, retopology, Substance Painter texturing, and clean delivery for any downstream pipeline.' },
  { format: 'portrait',  label: 'BRANDING',    title: 'Identity Reel',           accent: '#7cc142', style: 3, desc: 'Brand identity in motion — logo animation, color system reveals, and social-first brand content for DTC clients.' },
  { format: 'landscape', label: 'SAO HOUSE',   title: 'Song Hero Character',     accent: '#38c2d6', style: 4, desc: 'The lead character of the Sao House universe. Concept to full 3D — modeling, rigging, and hero renders for mobile-first social.' },
  { format: 'portrait',  label: 'ORIGINAL IP', title: 'Phin the Frog',           accent: '#4ec94e', style: 2, gumletId: '69c37c9fe018a8d7033bc9ee', desc: 'Phin the Frog — an original IP character from concept to full 3D. Character design, rigging, and animation built for social-first storytelling.' },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function rgba(hex: string, a: number) {
  const c = hexToRgb(hex)
  return `rgba(${c.r},${c.g},${c.b},${a})`
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawAbstract(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string, style: number) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, h)
  ctx.clip()

  if (style === 0) {
    for (let i = -h; i < w + h; i += 20) {
      const b = i % 60 === 0
      ctx.beginPath()
      ctx.strokeStyle = rgba(accent, b ? 0.22 : 0.04)
      ctx.lineWidth = b ? 1.5 : 0.5
      ctx.moveTo(i, 0)
      ctx.lineTo(i + h, h)
      ctx.stroke()
    }
    const g = ctx.createRadialGradient(w * 0.58, h * 0.38, 0, w * 0.58, h * 0.38, w * 0.6)
    g.addColorStop(0, rgba(accent, 0.32))
    g.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else if (style === 1) {
    const mD = Math.min(w, h)
    for (let k = 9; k >= 1; k--) {
      ctx.beginPath()
      ctx.arc(w * 0.54, h * 0.44, mD * 0.085 * k, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(accent, k === 1 ? 0.4 : 0.05)
      ctx.lineWidth = k === 1 ? 2 : 0.6
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(w * 0.54, h * 0.44, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = accent
    ctx.fill()
    const g2 = ctx.createRadialGradient(w * 0.54, h * 0.44, 0, w * 0.54, h * 0.44, mD * 0.6)
    g2.addColorStop(0, rgba(accent, 0.22))
    g2.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g2
    ctx.fillRect(0, 0, w, h)
  } else if (style === 2) {
    const step = Math.min(w, h) * 0.11
    for (let x = step / 2; x < w; x += step) {
      for (let y = step / 2; y < h; y += step) {
        const dist = Math.sqrt(Math.pow(x - w * 0.5, 2) + Math.pow(y - h * 0.44, 2))
        const aa = Math.max(0, 0.45 - dist / Math.max(w, h))
        ctx.beginPath()
        ctx.arc(x, y, dist < Math.min(w, h) * 0.1 ? 4 : 1.5, 0, Math.PI * 2)
        ctx.fillStyle = rgba(accent, aa)
        ctx.fill()
      }
    }
    const g3 = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.44, Math.min(w, h) * 0.62)
    g3.addColorStop(0, rgba(accent, 0.24))
    g3.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g3
    ctx.fillRect(0, 0, w, h)
  } else if (style === 3) {
    for (let sy = 0; sy < h; sy += 8) {
      ctx.fillStyle = rgba(accent, sy % 24 === 0 ? 0.16 : 0.022)
      ctx.fillRect(0, sy, w, sy % 24 === 0 ? 2 : 1)
    }
    const g4 = ctx.createLinearGradient(0, 0, w * 0.68, 0)
    g4.addColorStop(0, rgba(accent, 0.26))
    g4.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g4
    ctx.fillRect(0, 0, w, h)
  } else {
    const bars = [0.06, 0.17, 0.29, 0.43, 0.56, 0.68, 0.80]
    for (let bi = 0; bi < bars.length; bi++) {
      ctx.fillStyle = rgba(accent, bi % 2 === 0 ? 0.24 : 0.06)
      ctx.fillRect(bars[bi] * w, 0, bi % 2 === 0 ? 3 : 1, h)
    }
    const g5 = ctx.createRadialGradient(0, h, 0, 0, h, w * 0.78)
    g5.addColorStop(0, rgba(accent, 0.3))
    g5.addColorStop(1, rgba(accent, 0))
    ctx.fillStyle = g5
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GlobeWork() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [globeGallery, setGlobeGallery] = useState<GlobeWorkGalleryState>(null)
  const setGlobeGalleryRef = useRef(setGlobeGallery)
  setGlobeGalleryRef.current = setGlobeGallery

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const root = wrap

    let destroyed = false
    let animId = 0
    let threeRenderer: THREEType.WebGLRenderer | null = null
    const disposables: Array<{ dispose: () => void }> = []

    async function boot() {
      const THREE = await import('three')
      if (destroyed) return

      // ── Detect mobile ────────────────────────────────────────
      let isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 600

      // ── Card dimensions ──────────────────────────────────────
      const SCALE = isMobile ? 0.58 : 1.0
      const CARD = {
        landscape: { w: 1.55 * SCALE, h: 0.875 * SCALE },
        portrait:  { w: 0.62 * SCALE, h: 1.10  * SCALE },
      }
      const GAP_FACTOR = isMobile ? 1.42 : 1.38
      const CORNER_R   = 0.06
      const N          = ITEMS.length

      function computeRadius() {
        let sum = 0
        for (const item of ITEMS) {
          const d = CARD[item.format]
          sum += Math.max(d.w, d.h)
        }
        return (sum / ITEMS.length) * GAP_FACTOR * Math.sqrt(ITEMS.length / (4 * Math.PI))
      }
      // Slightly smaller “globe” so tether arcs sit clearly inside the card shell (curve stays a true great circle)
      const SPHERE_SCALE = 0.92
      const RADIUS = computeRadius() * SPHERE_SCALE

      const stageSlot = root.querySelector('#globe-stage')
      const stageRoot = stageSlot instanceof HTMLElement ? stageSlot : root

      function computeCamZ() {
        const rw_ = Math.max(1, stageRoot.clientWidth)
        const rh_ = Math.max(1, stageRoot.clientHeight)
        const aspect = rw_ / rh_
        const fovRad = (isMobile ? 50 : 46) * Math.PI / 180
        let neededZ = (RADIUS * 1.15) / Math.tan(fovRad / 2)
        if (aspect < 0.65) neededZ *= 1.15
        // Pull back on mobile so the globe reads smaller in the (shorter) wrap — touch target is only modestly larger than the sphere
        if (isMobile) neededZ *= 1.18
        return neededZ
      }

      // ── Texture helpers ──────────────────────────────────────
      function makeTexture(item: GlobeItem, thumbImg?: HTMLImageElement): THREEType.CanvasTexture {
        const isP = item.format === 'portrait'
        const TW  = isP ? (isMobile ? 256 : 320) : (isMobile ? 384 : 512)
        const TH  = isP ? (isMobile ? 455 : 568) : (isMobile ? 240 : 320)
        const CR  = Math.round(TW * CORNER_R)

        const c   = document.createElement('canvas')
        c.width = TW; c.height = TH
        const ctx = c.getContext('2d')!

        rrPath(ctx, 0, 0, TW, TH, CR)
        ctx.clip()

        const bg = ctx.createLinearGradient(0, 0, TW, TH)
        bg.addColorStop(0, '#14152a')
        bg.addColorStop(1, '#090a16')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, TW, TH)

        const artH = TH * 0.62
        let thumbDrawn = false
        if (thumbImg) {
          try {
            const scale = Math.max(TW / thumbImg.naturalWidth, artH / thumbImg.naturalHeight)
            const sw    = thumbImg.naturalWidth  * scale
            const sh    = thumbImg.naturalHeight * scale
            // Cover + vertical center crops top & bottom equally — heads often sit high in frame; pin top when we overflow height.
            const tx = (TW - sw) / 2
            const ty = sh > artH ? 0 : (artH - sh) / 2
            ctx.drawImage(thumbImg, tx, ty, sw, sh)
            // Light veil for text contrast — keep thumbs clearer than a heavy “fog”
            ctx.fillStyle = 'rgba(9,10,22,0.26)'
            ctx.fillRect(0, 0, TW, artH)
            ctx.fillStyle = rgba(item.accent, 0.035)
            ctx.fillRect(0, 0, TW, artH)
            thumbDrawn = true
          } catch {
            // Canvas tainted (CORS) — fall through to abstract art
          }
        }
        if (!thumbDrawn) {
          drawAbstract(ctx, TW, artH, item.accent, item.style)
        }

        if (!isMobile) {
          const imgData = ctx.getImageData(0, 0, TW, TH)
          const d = imgData.data
          const grainAmp = 14 * 0.55
          for (let pi = 0; pi < d.length; pi += 4) {
            const n = (Math.random() - 0.5) * grainAmp
            d[pi]     = Math.min(255, Math.max(0, d[pi]     + n))
            d[pi + 1] = Math.min(255, Math.max(0, d[pi + 1] + n))
            d[pi + 2] = Math.min(255, Math.max(0, d[pi + 2] + n))
          }
          ctx.putImageData(imgData, 0, 0)
          rrPath(ctx, 0, 0, TW, TH, CR)
          ctx.clip()
        }

        // Fade only the title band — old start (0.45·TH) sat inside art (0–0.62·TH) and dulled thumbs
        const fade = ctx.createLinearGradient(0, artH, 0, TH)
        fade.addColorStop(0, 'rgba(9,10,22,0)')
        fade.addColorStop(0.36, 'rgba(9,10,22,0.84)')
        fade.addColorStop(1, 'rgba(9,10,22,1)')
        ctx.fillStyle = fade
        ctx.fillRect(0, artH, TW, TH - artH)

        ctx.save()
        rrPath(ctx, 0.5, 0.5, TW - 1, TH - 1, CR - 0.5)
        ctx.strokeStyle = rgba(item.accent, 0.18)
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.restore()

        ctx.fillStyle = item.accent
        ctx.fillRect(CR, TH - 2, TW - CR * 2, 2)

        const PAD = 18

        // Title — left-aligned, bottom-anchored, word-wrap
        const titleSize = isP ? 17 : 21
        const lh        = isP ? 23 : 27
        ctx.font      = `900 ${titleSize}px 'Jost',sans-serif`
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        const words = item.title.toUpperCase().split(' ')
        let line = ''
        const lines: string[] = []
        const mxW = TW - PAD * 2
        for (const word of words) {
          const test = line + word + ' '
          if (ctx.measureText(test).width > mxW && line) {
            lines.push(line.trim()); line = word + ' '
          } else { line = test }
        }
        lines.push(line.trim())
        const titleBottom = TH - 20
        const titleTop    = titleBottom - (lines.length - 1) * lh
        for (let li = 0; li < lines.length; li++) {
          ctx.fillText(lines[li], PAD, titleTop + li * lh)
        }

        // Label (subline) — sits above title with clear gap
        const labelY = titleTop - 26
        ctx.fillStyle = rgba(item.accent, 0.9)
        ctx.font      = `700 11px 'Jost',sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText(item.label.toUpperCase(), PAD, labelY)

        // Radial edge blend — dissolves card into the scene at its borders.
        // Center above geometric midpoint so portrait art (top-heavy thumbs) isn’t vignetted; keep core wide enough text stays legible.
        ctx.globalCompositeOperation = 'destination-in'
        const outerR   = Math.max(TW, TH) * 0.65
        const edgeCy   = isP ? TH * 0.40 : TH * 0.46
        const edgeMask = ctx.createRadialGradient(TW / 2, edgeCy, 0, TW / 2, edgeCy, outerR)
        edgeMask.addColorStop(0,    'rgba(0,0,0,1)')
        edgeMask.addColorStop(0.56, 'rgba(0,0,0,1)')
        edgeMask.addColorStop(0.88, 'rgba(0,0,0,0.93)')
        edgeMask.addColorStop(1,    'rgba(0,0,0,0.30)')
        ctx.fillStyle = edgeMask
        ctx.fillRect(0, 0, TW, TH)
        ctx.globalCompositeOperation = 'source-over'

        const tex = new THREE.CanvasTexture(c)
        disposables.push(tex)
        return tex
      }

      const glowCache: Record<string, THREEType.CanvasTexture> = {}
      function makeGlowTexture(accent: string): THREEType.CanvasTexture {
        if (glowCache[accent]) return glowCache[accent]
        const c = document.createElement('canvas')
        c.width = 256; c.height = 256
        const ctx = c.getContext('2d')!
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
        g.addColorStop(0,    rgba(accent, 0.55))
        g.addColorStop(0.35, rgba(accent, 0.20))
        g.addColorStop(0.65, rgba(accent, 0.06))
        g.addColorStop(1,    rgba(accent, 0))
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 256, 256)
        const tex = new THREE.CanvasTexture(c)
        disposables.push(tex)
        glowCache[accent] = tex
        return tex
      }

      // ── Pre-load Gumlet thumbnails (CORS-safe, 6s timeout per image) ──
      const thumbMap = new Map<number, HTMLImageElement>()
      await Promise.all(
        ITEMS.map((item, idx) => {
          const thumbUrl = item.galleryImages?.[0] ?? (item.gumletId ? GUMLET_THUMB(item.gumletId) : null)
          if (!thumbUrl) return Promise.resolve()
          return new Promise<void>((resolve) => {
            const img = new Image()
            const timer = setTimeout(resolve, 6000)
            img.onload  = () => { clearTimeout(timer); thumbMap.set(idx, img); resolve() }
            img.onerror = () => { clearTimeout(timer); resolve() }
            img.src = thumbUrl
          })
        })
      )
      if (destroyed) return

      // Wait for fonts before drawing card textures
      await document.fonts.ready
      if (destroyed) return

      // ── THREE.js Scene ───────────────────────────────────────
      const q = root.querySelector('#globe-canvas')
      if (!(q instanceof HTMLCanvasElement)) {
        console.error('[GlobeWork] #globe-canvas not found')
        return
      }
      const globeCanvas: HTMLCanvasElement = q

      const rw = Math.max(1, stageRoot.clientWidth)
      const rh = Math.max(1, stageRoot.clientHeight)

      const renderer = new THREE.WebGLRenderer({
        canvas: globeCanvas,
        antialias: !isMobile,
        alpha: false,
        powerPreference: 'high-performance',
      })
      threeRenderer = renderer
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(rw, rh)
      renderer.setClearColor(0x1e1f2e, 1)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x1e1f2e, isMobile ? 0.015 : 0.019)

      const FOV    = isMobile ? 50 : 46
      const camera = new THREE.PerspectiveCamera(FOV, rw / rh, 0.1, 200)
      camera.position.set(0, 0, computeCamZ())

      scene.add(new THREE.AmbientLight(0xffffff, 0.5))
      const keyLight = new THREE.DirectionalLight(0xfff5e0, 0.9)
      keyLight.position.set(5, 8, 7)
      scene.add(keyLight)
      const fillLight = new THREE.DirectionalLight(0xc0e8ff, 0.3)
      fillLight.position.set(-6, -3, -4)
      scene.add(fillLight)

      // Particles — fixed screen-space size so nothing ever scales up large
      const sp         = RADIUS * 5.2
      const totalStars = isMobile ? 250 : 600
      const starTiers  = [
        { share: 0.60, size: 1.0, opacity: 0.15 },  // many tiny faint
        { share: 0.30, size: 1.8, opacity: 0.22 },  // medium
        { share: 0.10, size: 2.5, opacity: 0.38 },  // few bright — max 2.5px
      ]
      for (const tier of starTiers) {
        const count  = Math.round(totalStars * tier.share)
        const geo    = new THREE.BufferGeometry()
        disposables.push(geo)
        const pos    = new Float32Array(count * 3)
        for (let pi = 0; pi < count * 3; pi++) pos[pi] = (Math.random() - 0.5) * sp
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        const mat = new THREE.PointsMaterial({
          color: 0xffffff, size: tier.size, sizeAttenuation: false,
          transparent: true, opacity: tier.opacity,
        })
        disposables.push(mat)
        scene.add(new THREE.Points(geo, mat))
      }

      // Tight atmospheric core — small, low-contrast, smooth mesh so it reads as volume not a 2D disc
      const corePulseR = RADIUS * (isMobile ? 0.1 : 0.12)
      const coreGeo = new THREE.SphereGeometry(corePulseR, 32, 24)
      disposables.push(coreGeo)
      const corePulseMat = new THREE.MeshBasicMaterial({
        color:       0x6d7a94,
        transparent: true,
        opacity:     isMobile ? 0.028 : 0.034,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        depthTest:   true,
      })
      disposables.push(corePulseMat)
      const corePulseMesh = new THREE.Mesh(coreGeo, corePulseMat)
      corePulseMesh.position.set(0, 0, 0)
      corePulseMesh.renderOrder = -3
      scene.add(corePulseMesh)

      const haloPulseR = RADIUS * (isMobile ? 0.22 : 0.26)
      const haloGeo = new THREE.SphereGeometry(haloPulseR, 28, 20)
      disposables.push(haloGeo)
      const haloPulseMat = new THREE.MeshBasicMaterial({
        color:       0x5c6578,
        transparent: true,
        opacity:     isMobile ? 0.009 : 0.012,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        depthTest:   true,
      })
      disposables.push(haloPulseMat)
      const haloPulseMesh = new THREE.Mesh(haloGeo, haloPulseMat)
      haloPulseMesh.position.set(0, 0, 0)
      haloPulseMesh.renderOrder = -4
      scene.add(haloPulseMesh)

      const group = new THREE.Group()
      scene.add(group)
      const meshes: THREEType.Mesh[]     = []
      const glowMeshes: THREEType.Mesh[] = []

      type GlobeSlot = {
        pos: THREEType.Vector3
        out: THREEType.Vector3
        rt: THREEType.Vector3
        nu: THREEType.Vector3
        dim: { w: number; h: number }
        bottom: THREEType.Vector3
      }
      const slots: GlobeSlot[] = []
      for (let i = 0; i < N; i++) {
        const dim = CARD[ITEMS[i].format]
        const phi   = Math.acos(1 - 2 * (i + 0.5) / N)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        const pos   = new THREE.Vector3(
          RADIUS * Math.sin(phi) * Math.cos(theta),
          RADIUS * Math.cos(phi),
          RADIUS * Math.sin(phi) * Math.sin(theta),
        )
        const out  = pos.clone().normalize()
        const up   = Math.abs(out.y) < 0.98 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
        const rt   = new THREE.Vector3().crossVectors(up, out).normalize()
        const nu   = new THREE.Vector3().crossVectors(out, rt)
        const bottom = pos.clone().addScaledVector(nu, -dim.h * 0.46)
        slots.push({ pos, out, rt, nu, dim, bottom })
      }

      const nearestIdx: number[] = new Array(N)
      for (let i = 0; i < N; i++) {
        let bestK = (i + 1) % N
        let bestDot = -Infinity
        const pi = slots[i].pos
        for (let k = 0; k < N; k++) {
          if (k === i) continue
          const dot = pi.dot(slots[k].pos)
          if (dot > bestDot) {
            bestDot = dot
            bestK = k
          }
        }
        nearestIdx[i] = bestK
      }

      const tetherLines: THREEType.Line[] = []
      const TETHER_R_SCALE = 0.93
      const arcSamplePool: THREEType.Vector3[] = []

      for (let i = 0; i < N; i++) {
        const item = ITEMS[i]
        const { pos, out, rt, nu, dim, bottom } = slots[i]

        const geo = new THREE.PlaneGeometry(dim.w, dim.h)
        disposables.push(geo)
        const mat = new THREE.MeshStandardMaterial({
          map:               makeTexture(item, thumbMap.get(i)),
          transparent:       true,
          alphaTest:         0.05,
          depthWrite:        true,
          depthTest:         true,
          polygonOffset:     true,
          polygonOffsetFactor: -0.6,
          polygonOffsetUnits:  -0.6,
          roughness:         0.58,
          metalness:         0.05,
          side:              THREE.FrontSide,
          emissive:          new THREE.Color(item.accent),
          emissiveIntensity: 0.0,
        })
        disposables.push(mat)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.copy(pos)
        mesh.renderOrder = 1

        const bMat = new THREE.Matrix4().makeBasis(rt, nu, out)
        mesh.quaternion.setFromRotationMatrix(bMat)
        mesh.userData = { item, out: out.clone() }
        meshes.push(mesh)

        const j = nearestIdx[i]
        const a = bottom.clone().normalize()
        const b = slots[j].pos.clone().normalize()
        const axis = new THREE.Vector3().crossVectors(a, b)
        if (axis.lengthSq() < 1e-12) {
          const aux = new THREE.Vector3(1, 0, 0)
          if (Math.abs(a.x) > 0.92) aux.set(0, 1, 0)
          axis.crossVectors(a, aux)
        }
        const ab = Math.max(-1, Math.min(1, a.dot(b)))
        const arcAngle = Math.acos(ab)

        if (arcAngle > 1e-4 && axis.lengthSq() > 1e-12 && Number.isFinite(arcAngle)) {
          axis.normalize()
          const rArc = bottom.length() * TETHER_R_SCALE
          // Fixed 32–52 steps made long great-circle arcs read as jagged polylines; scale with span.
          const segPerRad = isMobile ? 42 : 68
          const nArc = Math.min(240, Math.max(40, Math.ceil(arcAngle * segPerRad)))
          const nPts = nArc + 1
          while (arcSamplePool.length < nPts) arcSamplePool.push(new THREE.Vector3())
          for (let s = 0; s <= nArc; s++) {
            const u = s / nArc
            arcSamplePool[s].copy(a).applyAxisAngle(axis, arcAngle * u).multiplyScalar(rArc)
          }

          const tetherGeo = new THREE.BufferGeometry().setFromPoints(arcSamplePool.slice(0, nPts))
          disposables.push(tetherGeo)
          const tetherMat = new THREE.LineBasicMaterial({
            color:                 0x98a2cc,
            transparent:           true,
            opacity:               isMobile ? 0.05 : 0.072,
            depthTest:             true,
            depthWrite:            false,
            polygonOffset:         true,
            polygonOffsetFactor:   2.5,
            polygonOffsetUnits:    2,
          })
          disposables.push(tetherMat)
          const tetherLine = new THREE.Line(tetherGeo, tetherMat)
          tetherLine.renderOrder = 0
          tetherLines.push(tetherLine)
        }

        if (!isMobile) {
          const glowScale = Math.max(dim.w, dim.h) * 1.6
          const glowGeo   = new THREE.PlaneGeometry(glowScale, glowScale)
          disposables.push(glowGeo)
          const glowMat = new THREE.MeshBasicMaterial({
            map:         makeGlowTexture(item.accent),
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
            side:        THREE.FrontSide,
            opacity:     0.0,
          })
          disposables.push(glowMat)
          const gMesh = new THREE.Mesh(glowGeo, glowMat)
          const bp    = pos.clone().addScaledVector(out, -0.04)
          gMesh.position.copy(bp)
          gMesh.quaternion.setFromRotationMatrix(bMat)
          gMesh.userData = { item }
          gMesh.renderOrder = 2
          glowMeshes.push(gMesh)
        }
      }

      for (const tl of tetherLines) group.add(tl)
      for (const m of meshes) group.add(m)
      for (const g of glowMeshes) group.add(g)

      // Face hero card toward +Z, then roll around the view axis so its local "up" matches world +Y (straight on screen).
      {
        const HERO_INDEX = 0
        const heroOut = slots[HERO_INDEX].out.clone().normalize()
        const towardViewer = new THREE.Vector3(0, 0, 1)
        const qAlign = new THREE.Quaternion().setFromUnitVectors(heroOut, towardViewer)
        group.quaternion.copy(qAlign)
        const nuW = slots[HERO_INDEX].nu.clone().applyQuaternion(qAlign)
        nuW.z = 0
        if (nuW.lengthSq() > 1e-10) {
          nuW.normalize()
          group.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), Math.atan2(nuW.x, nuW.y))
        }
      }

      renderer.compile(scene, camera)

      // Update count display
      const countEl = root.querySelector<HTMLElement>('#globe-count')
      if (countEl) {
        const lC = ITEMS.filter(x => x.format === 'landscape').length
        const pC = ITEMS.filter(x => x.format === 'portrait').length
        countEl.textContent = `${lC} 16:9  ·  ${pC} 9:16`
      }

      // ── Interaction ──────────────────────────────────────────
      const raycaster = new THREE.Raycaster()
      const mouse2    = new THREE.Vector2()
      let hoverPickX: number | null = null
      let hoverPickY: number | null = null
      let modalIsOpen = false

      let isDragging    = false
      let prevMx = 0, prevMy = 0, downMx = 0, downMy = 0
      let velX = 0, velY = 0
      let hoveredMesh: THREEType.Mesh | null = null
      let pinchActive    = false
      let pinchStartDist = 0
      let pinchStartZ    = 0

      const hintEl = root.querySelector<HTMLElement>('#globe-hint')

      function updateHover(cx: number, cy: number) {
        if (modalIsOpen) return
        const rect = globeCanvas.getBoundingClientRect()
        mouse2.set(
          ((cx - rect.left) / rect.width)  *  2 - 1,
          ((cy - rect.top)  / rect.height) * -2 + 1,
        )
        raycaster.setFromCamera(mouse2, camera)
        const hits = raycaster.intersectObjects(meshes)
        const prev = hoveredMesh
        hoveredMesh = hits.length ? (hits[0].object as THREEType.Mesh) : null
        if (hoveredMesh !== prev) {
          globeCanvas.className = isDragging ? 'dragging' : hoveredMesh ? 'hovering' : ''
        }
      }

      function getTouchDist(t1: Touch, t2: Touch) {
        const dx = t1.clientX - t2.clientX
        const dy = t1.clientY - t2.clientY
        return Math.sqrt(dx * dx + dy * dy)
      }

      // Mouse
      const onMouseDown = (e: MouseEvent) => {
        isDragging = true
        prevMx = downMx = e.clientX; prevMy = downMy = e.clientY
        velX *= 0.15; velY *= 0.15  // sharp grab — momentum drops but doesn't dead-stop
        globeCanvas.classList.add('dragging')
        hintEl?.classList.add('fade')
      }
      const MAX_VEL = 0.03  // ~1.8 rad/s at 60fps — firm orbital speed cap
      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const rawY = (e.clientX - prevMx) * 0.002
          const rawX = (e.clientY - prevMy) * 0.002
          velY = velY * 0.94 + rawY * 0.06
          velX = velX * 0.94 + rawX * 0.06
          velY = Math.max(-MAX_VEL, Math.min(MAX_VEL, velY))
          velX = Math.max(-MAX_VEL, Math.min(MAX_VEL, velX))
          prevMx = e.clientX; prevMy = e.clientY
          // rotation applied in animate loop — not here
        } else {
          hoverPickX = e.clientX
          hoverPickY = e.clientY
        }
      }
      const onMouseUp = (e: MouseEvent) => {
        globeCanvas.classList.remove('dragging'); isDragging = false
        const dx = e.clientX - downMx, dy = e.clientY - downMy
        if (Math.sqrt(dx * dx + dy * dy) < 8 && hoveredMesh) {
          openModal(hoveredMesh.userData.item as GlobeItem)
        } else {
          hoverPickX = e.clientX
          hoverPickY = e.clientY
        }
      }

      const onPointerLeave = () => {
        hoverPickX = null
        hoverPickY = null
        const prev = hoveredMesh
        hoveredMesh = null
        if (prev) globeCanvas.className = isDragging ? 'dragging' : ''
      }

      globeCanvas.addEventListener('mousedown', onMouseDown)
      globeCanvas.addEventListener('pointerleave', onPointerLeave)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup',   onMouseUp)

      // Touch
      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault()
        hintEl?.classList.add('fade')
        if (e.touches.length === 2) {
          pinchActive = true; isDragging = false
          pinchStartDist = getTouchDist(e.touches[0], e.touches[1])
          pinchStartZ    = camera.position.z
        } else if (e.touches.length === 1) {
          pinchActive = false; isDragging = true
          const t = e.touches[0]
          prevMx = downMx = t.clientX; prevMy = downMy = t.clientY
          velX *= 0.15; velY *= 0.15
        }
      }
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault()
        if (e.touches.length === 2 && pinchActive) {
          const newDist = getTouchDist(e.touches[0], e.touches[1])
          const scale   = pinchStartDist / newDist
          const minZ    = RADIUS * 1.6, maxZ = RADIUS * 5.5
          camera.position.z = Math.min(maxZ, Math.max(minZ, pinchStartZ * scale))
        } else if (e.touches.length === 1 && isDragging) {
          const t = e.touches[0]
          const rawY = (t.clientX - prevMx) * 0.002
          const rawX = (t.clientY - prevMy) * 0.002
          velY = velY * 0.94 + rawY * 0.06
          velX = velX * 0.94 + rawX * 0.06
          velY = Math.max(-MAX_VEL, Math.min(MAX_VEL, velY))
          velX = Math.max(-MAX_VEL, Math.min(MAX_VEL, velX))
          prevMx = t.clientX; prevMy = t.clientY
          // rotation applied in animate loop — not here
        }
      }
      const onTouchEnd = (e: TouchEvent) => {
        e.preventDefault()
        if (e.touches.length < 2) pinchActive = false
        if (e.touches.length === 0) {
          isDragging = false
          const t   = e.changedTouches[0]
          const dx  = t.clientX - downMx, dy = t.clientY - downMy
          if (Math.sqrt(dx * dx + dy * dy) < (isMobile ? 18 : 8)) {
            const rect = globeCanvas.getBoundingClientRect()
            mouse2.set(
              ((t.clientX - rect.left) / rect.width)  *  2 - 1,
              ((t.clientY - rect.top)  / rect.height) * -2 + 1,
            )
            raycaster.setFromCamera(mouse2, camera)
            const hits = raycaster.intersectObjects(meshes)
            if (hits.length) openModal((hits[0].object as THREEType.Mesh).userData.item as GlobeItem)
          }
        }
      }

      globeCanvas.addEventListener('touchstart', onTouchStart, { passive: false })
      globeCanvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
      globeCanvas.addEventListener('touchend',   onTouchEnd,   { passive: false })

      // ── Modal ────────────────────────────────────────────────
      const overlay    = root.querySelector<HTMLElement>('#globe-modal-overlay')!
      const mCard      = root.querySelector<HTMLElement>('#globe-modal-card')!
      const mCanvas    = root.querySelector<HTMLCanvasElement>('#globe-modal-canvas')!
      const mVideoWrap = root.querySelector<HTMLElement>('#globe-modal-video-wrap')!
      const mIframe    = root.querySelector<HTMLIFrameElement>('#globe-modal-iframe')!
      const mLabel     = root.querySelector<HTMLElement>('#globe-modal-label')!
      const mFmt       = root.querySelector<HTMLElement>('#globe-modal-format-tag')!
      const mTitle     = root.querySelector<HTMLElement>('#globe-modal-title')!
      const mDesc      = root.querySelector<HTMLElement>('#globe-modal-desc')!
      const mGlow      = root.querySelector<HTMLElement>('#globe-modal-glow-bar')!

      function openModal(item: GlobeItem) {
        hoverPickX = null
        hoverPickY = null
        const isP = item.format === 'portrait'
        mCard.className = 'globe-modal-card fmt-' + item.format
        mCard.style.boxShadow = `0 40px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04),0 0 60px ${rgba(item.accent, 0.12)}`

        setGlobeGalleryRef.current(null)

        if (item.galleryImages?.length) {
          setGlobeGalleryRef.current({
            srcs: item.galleryImages,
            format: item.format,
            accent: item.accent,
          })
          mCanvas.style.display = 'none'
          mVideoWrap.style.display = 'none'
          mVideoWrap.style.width = ''
          mVideoWrap.style.maxHeight = ''
          mVideoWrap.style.aspectRatio = ''
          mIframe.src = ''
        } else if (item.gumletId) {
          mCanvas.style.display = 'none'
          mVideoWrap.style.display = 'block'
          setGlobeModalVideoWrapStyles(mVideoWrap, window.innerWidth, window.innerHeight, isP)
          mIframe.src = item.gumletEmbedQuery
            ? `https://play.gumlet.io/embed/${item.gumletId}?${item.gumletEmbedQuery}`
            : GUMLET_EMBED(item.gumletId)
        } else {
          mCanvas.style.display = 'block'
          mVideoWrap.style.display = 'none'
          mVideoWrap.style.width = ''
          mVideoWrap.style.maxHeight = ''
          mVideoWrap.style.aspectRatio = ''
          mIframe.src = ''

          const { W, H } = getGlobeModalAbstractCanvasSize(
            window.innerWidth,
            window.innerHeight,
            item.format,
          )

          mCanvas.width  = W * 2; mCanvas.height = H * 2
          mCanvas.style.width  = W + 'px'; mCanvas.style.height = H + 'px'
          const ctx = mCanvas.getContext('2d')!
          ctx.scale(2, 2)
          const bg = ctx.createLinearGradient(0, 0, W, H)
          bg.addColorStop(0, '#14152a')
          bg.addColorStop(1, '#090a16')
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
          drawAbstract(ctx, W, H, item.accent, item.style)
          const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.95)
          vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.5)')
          ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H)
          const gb = ctx.createLinearGradient(0, H * 0.6, 0, H)
          gb.addColorStop(0, rgba(item.accent, 0)); gb.addColorStop(1, rgba(item.accent, 0.12))
          ctx.fillStyle = gb; ctx.fillRect(0, H * 0.6, W, H * 0.4)
        }

        mLabel.textContent    = item.label; mLabel.style.color = item.accent
        mFmt.textContent      = isP ? '9:16' : '16:9'
        mFmt.style.background = rgba(item.accent, 0.12); mFmt.style.color = item.accent
        mTitle.textContent    = item.title.toUpperCase()
        mDesc.textContent     = item.desc
        mGlow.style.background = `linear-gradient(90deg,transparent,${item.accent},transparent)`
        overlay.classList.toggle(
          'globe-modal-overlay--media',
          Boolean(item.gumletId || item.galleryImages?.length),
        )
        overlay.classList.add('open')
        modalIsOpen = true
      }

      function closeModal() {
        modalIsOpen = false
        hoverPickX = null
        hoverPickY = null
        setGlobeGalleryRef.current(null)
        overlay.classList.remove('globe-modal-overlay--media')
        overlay.classList.remove('open')
        // Stop video playback
        mIframe.src = ''
      }

      root.querySelector('#globe-modal-close')!.addEventListener('click', closeModal)
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
      const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
      document.addEventListener('keydown', onKeyDown)

      // ── Render loop ──────────────────────────────────────────
      const clock   = new THREE.Clock()
      const keyDir  = new THREE.Vector3(5, 8, 7).normalize()
      const _tmpV3  = new THREE.Vector3()  // reusable scratch — avoids per-frame allocation

      function animate() {
        animId = requestAnimationFrame(animate)
        const dt = Math.min(clock.getDelta(), 0.05)

        if (!modalIsOpen && hoverPickX !== null && hoverPickY !== null) {
          updateHover(hoverPickX, hoverPickY)
          hoverPickX = null
          hoverPickY = null
        }

        // Always apply accumulated velocity — ensures 60fps-locked rotation regardless of mouse polling rate
        group.rotation.x += velX
        group.rotation.y += velY

        if (!isDragging && !pinchActive) {
          // Zero-gravity momentum — decays to ~1% over ~15 seconds
          const decay = Math.pow(0.994, dt * 60)
          velX *= decay
          velY *= decay
          // Very slow X-axis centering — drifts back toward equatorial over ~60s
          group.rotation.x += (-group.rotation.x) * (0.0005 * dt * 60)
          // Satellite orbit auto-rotation — ~162s per full revolution (20% slower than 0.0008 baseline)
          group.rotation.y += 0.00064 * (dt * 60)
        }

        const hoverActive = hoveredMesh !== null

        for (let mi = 0; mi < meshes.length; mi++) {
          const m    = meshes[mi]
          const isHov = m === hoveredMesh
          const tgtS = isHov ? 1.055 : hoverActive ? 0.93 : 1.0
          m.scale.x += (tgtS - m.scale.x) * 0.12
          m.scale.y += (tgtS - m.scale.y) * 0.12
          ;(m.material as THREEType.MeshStandardMaterial).emissiveIntensity +=
            ((isHov ? 0.1 : 0.0) - (m.material as THREEType.MeshStandardMaterial).emissiveIntensity) * 0.1
          const faceDot  = Math.max(0, _tmpV3.copy(m.userData.out as THREEType.Vector3).applyEuler(group.rotation).dot(keyDir))
          const tgtOp    = faceDot * faceDot * 0.18 + 0.82
          ;(m.material as THREEType.MeshStandardMaterial).opacity +=
            (tgtOp - (m.material as THREEType.MeshStandardMaterial).opacity) * 0.06
        }

        for (let gi = 0; gi < glowMeshes.length; gi++) {
          const gm  = glowMeshes[gi]
          const cm  = meshes[gi]
          const isH = cm === hoveredMesh
          const dot = Math.max(0, _tmpV3.copy(cm.userData.out as THREEType.Vector3).applyEuler(group.rotation).dot(keyDir))
          const tgt = isH ? dot * dot * 0.38 + 0.22 : dot * dot * 0.38
          ;(gm.material as THREEType.MeshBasicMaterial).opacity +=
            (tgt - (gm.material as THREEType.MeshBasicMaterial).opacity) * 0.08
          const gScale = isH ? 1.12 : hoverActive ? 0.9 : 1.0
          gm.scale.x += (gScale - gm.scale.x) * 0.14
          gm.scale.y += (gScale - gm.scale.y) * 0.14
        }

        {
          const t = clock.getElapsedTime()
          const b0 = 0.5 + 0.5 * Math.sin(t * 1.35)
          const b1 = 0.5 + 0.5 * Math.sin(t * 1.05 + 0.7)
          let engage = 1.0
          if (isDragging || pinchActive) engage = 1.22
          else if (hoveredMesh) engage = 1.1
          const baseC = isMobile ? 0.028 : 0.034
          const baseH = isMobile ? 0.009 : 0.012
          corePulseMat.opacity = baseC * (0.72 + 0.28 * b0) * engage
          haloPulseMat.opacity = baseH * (0.78 + 0.22 * b1) * engage
          corePulseMesh.scale.setScalar(1 + 0.022 * b1)
          haloPulseMesh.scale.setScalar(1 + 0.018 * b0)
        }

        renderer.render(scene, camera)
      }
      const onVisibilityChange = () => {
        if (document.hidden) {
          cancelAnimationFrame(animId)
          animId = 0
        } else {
          clock.getDelta()
          if (animId === 0) animate()
        }
      }
      document.addEventListener('visibilitychange', onVisibilityChange)

      animate()

      // ── Resize ───────────────────────────────────────────────
      const onResize = () => {
        isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 600
        const rw2 = Math.max(1, stageRoot.clientWidth)
        const rh2 = Math.max(1, stageRoot.clientHeight)
        camera.aspect = rw2 / rh2
        camera.fov    = isMobile ? 50 : 46
        camera.updateProjectionMatrix()
        camera.position.z = computeCamZ()
        renderer.setSize(rw2, rh2)
      }
      window.addEventListener('resize', onResize)

      // ── Cleanup ──────────────────────────────────────────────
      return () => {
        cancelAnimationFrame(animId)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        globeCanvas.removeEventListener('mousedown',  onMouseDown)
        globeCanvas.removeEventListener('pointerleave', onPointerLeave)
        window.removeEventListener('mousemove',  onMouseMove)
        window.removeEventListener('mouseup',    onMouseUp)
        globeCanvas.removeEventListener('touchstart', onTouchStart)
        globeCanvas.removeEventListener('touchmove',  onTouchMove)
        globeCanvas.removeEventListener('touchend',   onTouchEnd)
        window.removeEventListener('resize',     onResize)
        document.removeEventListener('keydown',  onKeyDown)
        for (const d of disposables) d.dispose()
        renderer.dispose()
      }
    }

    let cleanupFn: (() => void) | undefined
    boot().then(fn => { cleanupFn = fn }).catch((err) => {
      console.error('[GlobeWork] WebGL setup failed:', err)
    })

    return () => {
      destroyed = true
      cleanupFn?.()
      if (animId) cancelAnimationFrame(animId)
      threeRenderer = null
    }
  }, [])

  return (
    <div ref={wrapRef} className="globe-work-wrap">
      {/* Header first in DOM: on mobile it stacks above the stage; on desktop it still overlays (absolute + z-index). */}
      <div className="globe-section-header">
        <p className="globe-section-tag">Selected Work</p>
        <h2 className="globe-section-h2">Built for scroll.<br />Designed to stop it.</h2>
        <p id="globe-hint" className="globe-section-subline globe-hint">
          Drag to Explore &nbsp;&middot;&nbsp; Tap to View
        </p>
      </div>

      <div id="globe-stage" className="globe-stage">
        <canvas id="globe-canvas" />
        <div id="globe-count" className="globe-count" />
      </div>

      <GlobeWorkModal globeGallery={globeGallery} />
    </div>
  )
}
