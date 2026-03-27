'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { MotionValue } from 'framer-motion'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import {
  CAREERS_FLOAT_CARDS,
  CAREERS_FLOAT_POSITIONS,
  type CareersFloatCard,
} from '@/lib/careers-portfolio-float'

function staticTiltForSide(side: 'left' | 'right'): CSSProperties {
  const y = side === 'left' ? -11 : 11
  return {
    transform: `rotateY(${y}deg) rotateX(5deg) rotateZ(${side === 'left' ? -1.5 : 1.5}deg)`,
    transformOrigin: 'center center',
    transformStyle: 'preserve-3d',
  }
}

function FloatCardTilt({
  side,
  scrollYProgress,
  cardIndex,
  children,
}: {
  side: 'left' | 'right'
  scrollYProgress: MotionValue<number>
  cardIndex: number
  children: ReactNode
}) {
  const reduce = useReducedMotion()

  const phase = cardIndex * 0.04
  const rotateX = useTransform(scrollYProgress, (p) => {
    if (reduce) return 5
    const t = p - 0.5 + phase
    return 5 + t * 3.2
  })
  const rotateZ = useTransform(scrollYProgress, (p) => {
    const base = side === 'left' ? -1.5 : 1.5
    if (reduce) return base
    const t = p - 0.5 + phase
    const sign = side === 'left' ? -1 : 1
    return base + t * 2.8 * sign
  })

  const rotateY = side === 'left' ? -11 : 11

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[0_16px_36px_rgba(0,0,0,0.45),0_2px_0_rgba(255,255,255,0.04)_inset]"
      style={{
        rotateY,
        rotateX,
        rotateZ,
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Subtle drifting portfolio thumbnails (same work as home globe) behind careers content.
 * Cards sit on left/right edges only; inner wrapper carries 3D tilt plus light scroll response (drift is translate-only).
 */
export function CareersFloatingPortfolio() {
  const { scrollYProgress } = useScroll()
  const cards = CAREERS_FLOAT_CARDS
  const positions = CAREERS_FLOAT_POSITIONS.slice(0, Math.min(cards.length, CAREERS_FLOAT_POSITIONS.length))

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden [perspective:1400px] [perspective-origin:50%_40%]"
      aria-hidden
    >
      {cards.map((card, i) => {
        const pos = positions[i]
        if (!pos) return null
        return (
          <CareersFloatRow
            key={card.key}
            card={card}
            pos={pos}
            index={i}
            scrollYProgress={scrollYProgress}
          />
        )
      })}
    </div>
  )
}

function CareersFloatRow({
  card,
  pos,
  index,
  scrollYProgress,
}: {
  card: CareersFloatCard
  pos: { side: 'left' | 'right'; edge: number; top: number }
  index: number
  scrollYProgress: MotionValue<number>
}) {
  const reduce = useReducedMotion()
  const duration = 36 + (index % 5) * 9
  const delay = -(index * 5.5)
  const aspectRatio = card.format === 'landscape' ? '16 / 9' : '9 / 16'

  const posStyle: CSSProperties =
    pos.side === 'left'
      ? { left: `${pos.edge}%`, top: `${pos.top}%`, right: 'auto' }
      : { right: `${pos.edge}%`, top: `${pos.top}%`, left: 'auto' }

  return (
    <div
      className="careers-portfolio-float-card absolute opacity-[0.11] sm:opacity-[0.15] md:opacity-[0.17]"
      style={{
        ...posStyle,
        aspectRatio,
        animation: reduce ? undefined : `careers-portfolio-drift ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        className={`h-full w-full ${pos.side === 'left' ? 'careers-portfolio-float-nudge-l' : 'careers-portfolio-float-nudge-r'}`}
      >
        {reduce ? (
          <div
            className="relative h-full w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-[0_16px_36px_rgba(0,0,0,0.45),0_2px_0_rgba(255,255,255,0.04)_inset]"
            style={staticTiltForSide(pos.side)}
          >
            <Image
              src={card.src}
              alt=""
              fill
              className="object-cover saturate-[0.72] brightness-[0.88]"
              sizes="(max-width: 640px) 96px, 172px"
            />
          </div>
        ) : (
          <FloatCardTilt side={pos.side} scrollYProgress={scrollYProgress} cardIndex={index}>
            <Image
              src={card.src}
              alt=""
              fill
              className="object-cover saturate-[0.72] brightness-[0.88]"
              sizes="(max-width: 640px) 96px, 172px"
            />
          </FloatCardTilt>
        )}
      </div>
    </div>
  )
}
