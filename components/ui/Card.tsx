'use client'

import { ReactNode, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'pink' | 'lime'
  hover?: boolean
  badge?: string
  tilt?: boolean
}

export function Card({ 
  children, 
  className, 
  variant = 'default', 
  hover = true, 
  badge,
  tilt = true 
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Mouse position for 3D tilt effect
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg'])

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current) return

    const rect = ref.current.getBoundingClientRect()

    const width = rect.width
    const height = rect.height

    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5

    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }

  const variantStyles = {
    default: 'glass-card',
    pink: 'glass-card glass-card-pink',
    lime: 'glass-card glass-card-lime',
  }

  const glowColors = {
    default: 'rgba(124, 193, 66, 0.3)',
    pink: 'rgba(221, 11, 131, 0.3)',
    lime: 'rgba(124, 193, 66, 0.4)',
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: tilt ? rotateX : 0,
        rotateY: tilt ? rotateY : 0,
        transformStyle: 'preserve-3d',
      }}
      whileHover={hover ? { 
        y: -12,
        transition: { duration: 0.3, ease: 'easeOut' }
      } : {}}
      animate={isHovered && hover ? {
        boxShadow: `0 20px 60px ${glowColors[variant]}`,
      } : {}}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative p-8',
        variantStyles[variant],
        hover && 'glass-card-hover cursor-pointer',
        className
      )}
    >
      {badge && (
        <motion.span 
          className="badge-recommended"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 260,
            damping: 20,
            delay: 0.2
          }}
        >
          {badge}
        </motion.span>
      )}
      <div style={{ transform: 'translateZ(20px)' }}>
        {children}
      </div>
    </motion.div>
  )
}
