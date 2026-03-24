'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface GumletBackgroundProps {
  /** Full Gumlet HLS URL — e.g. https://video.gumlet.io/.../main.m3u8 */
  url: string
  /** Video opacity once loaded (0–1). Defaults to 0.5 */
  opacity?: number
  /** Extra classes for the overlay div — use to tint/blur per section */
  overlayClassName?: string
  /** Extra classes for the root wrapper */
  className?: string
  /** Show a spinner while the video loads. Defaults to true */
  showSpinner?: boolean
  /** Called when the video is ready to play */
  onReady?: () => void
}

/**
 * Drop-in Gumlet video background.
 * Renders as position:absolute inset-0 — wrap in a relative container.
 *
 * Usage:
 *   <section className="relative min-h-screen overflow-hidden">
 *     <GumletBackground url="https://video.gumlet.io/.../main.m3u8" />
 *     <div className="relative z-10">…content…</div>
 *   </section>
 */
export function GumletBackground({
  url,
  opacity = 0.5,
  overlayClassName,
  className,
  showSpinner = true,
  onReady,
}: GumletBackgroundProps) {
  const [ready, setReady] = useState(false)

  const handleReady = () => {
    setReady(true)
    onReady?.()
  }

  return (
    <div className={cn('absolute inset-0 z-0', className)}>
      {/* Spinner — shown until video is ready */}
      {showSpinner && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-navy">
          <div className="relative">
            <motion.div
              className="w-16 h-16 border-4 border-lime-400/20 border-t-lime-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-0 w-16 h-16 border-4 border-emerald-400/30 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Video layer — fades in on ready */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? opacity : 0 }}
        transition={{ duration: 0.6 }}
      >
        <ReactPlayer
          url={url}
          playing
          loop
          muted
          controls={false}
          playsinline
          width="100%"
          height="100%"
          onReady={handleReady}
          config={{
            file: {
              attributes: {
                style: { width: '100%', height: '100%', objectFit: 'cover' },
              },
            },
          }}
          style={{ pointerEvents: 'none' }}
        />
      </motion.div>

      {/* Overlay — tint/blur to suit the section */}
      <div
        className={cn(
          'absolute inset-0 bg-brand-navy/50 backdrop-blur-[2px]',
          overlayClassName
        )}
      />
    </div>
  )
}
