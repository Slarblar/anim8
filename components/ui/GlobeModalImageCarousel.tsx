'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IoChevronBack, IoChevronForward, IoRefresh } from 'react-icons/io5'

type Format = 'landscape' | 'portrait'

const MIN_SCALE = 1
const MAX_SCALE = 4
const WHEEL_FACTOR = 1.09

export function GlobeModalImageCarousel({
  images,
  format,
  accent,
}: {
  images: string[]
  format: Format
  accent: string
}) {
  const [index, setIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragActive = useRef(false)
  const drag = useRef<{ px: number; py: number; sx: number; sy: number } | null>(null)
  const pinch = useRef<{ dist: number; baseScale: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const n = images.length
  const safeIndex = n ? ((index % n) + n) % n : 0

  const resetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    setIndex(0)
    resetView()
  }, [images, resetView])

  const go = useCallback(
    (delta: number) => {
      if (n <= 1) return
      setIndex((i) => (i + delta + n) % n)
      resetView()
    },
    [n, resetView],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setScale((s) => {
        const next = e.deltaY < 0 ? s * WHEEL_FACTOR : s / WHEEL_FACTOR
        const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
        if (clamped <= MIN_SCALE) setPan({ x: 0, y: 0 })
        return clamped
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const touchDist = (a: React.Touch, b: React.Touch) => {
    const dx = a.clientX - b.clientX
    const dy = a.clientY - b.clientY
    return Math.hypot(dx, dy)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= MIN_SCALE) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragActive.current = true
    setDragging(true)
    drag.current = { px: pan.x, py: pan.y, sx: e.clientX, sy: e.clientY }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !dragActive.current) return
    setPan({
      x: d.px + (e.clientX - d.sx),
      y: d.py + (e.clientY - d.sy),
    })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    drag.current = null
    dragActive.current = false
    setDragging(false)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinch.current = {
        dist: touchDist(e.touches[0], e.touches[1]),
        baseScale: scale,
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault()
      const d = touchDist(e.touches[0], e.touches[1])
      const ratio = d / pinch.current.dist
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.current.baseScale * ratio))
      setScale(next)
      if (next <= MIN_SCALE) setPan({ x: 0, y: 0 })
    }
  }

  const onTouchEnd = () => {
    pinch.current = null
  }

  if (!n) return null

  const src = images[safeIndex]

  return (
    <div className="globe-gallery-inner">
      <div
        ref={viewportRef}
        className={`globe-gallery-viewport fmt-${format}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={resetView}
        style={{ cursor: scale > MIN_SCALE ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <div
          className="globe-gallery-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 0.12s ease-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic public paths, no optimization API */}
          <img src={src} alt="" className="globe-gallery-img" draggable={false} />
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            className="globe-gallery-nav globe-gallery-nav--prev"
            aria-label="Previous image"
            onClick={() => go(-1)}
            style={{ color: accent, borderColor: `${accent}55` }}
          >
            <IoChevronBack size={22} />
          </button>
          <button
            type="button"
            className="globe-gallery-nav globe-gallery-nav--next"
            aria-label="Next image"
            onClick={() => go(1)}
            style={{ color: accent, borderColor: `${accent}55` }}
          >
            <IoChevronForward size={22} />
          </button>
        </>
      )}

      <div className="globe-gallery-toolbar">
        <span className="globe-gallery-counter" style={{ color: accent }}>
          {safeIndex + 1} / {n}
        </span>
        <button
          type="button"
          className="globe-gallery-reset"
          aria-label="Reset zoom and pan"
          onClick={resetView}
          disabled={scale <= MIN_SCALE && pan.x === 0 && pan.y === 0}
          style={{ color: accent, borderColor: `${accent}44` }}
        >
          <IoRefresh size={18} />
        </button>
      </div>
      <p className="globe-gallery-hint">Scroll to zoom · drag to pan · ← → keys</p>
    </div>
  )
}
