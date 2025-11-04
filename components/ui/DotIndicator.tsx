'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface DotIndicatorProps {
  isActive: boolean
  onClick: () => void
  index: number
  disabled?: boolean
  color?: 'cyan' | 'lime'
}

export function DotIndicator({ 
  isActive, 
  onClick, 
  index, 
  disabled = false, 
  color = 'cyan' 
}: DotIndicatorProps) {
  const colorStyles = {
    cyan: {
      active: 'bg-brand-cyan',
      inactive: 'bg-brand-cyan/30 hover:bg-brand-cyan/50'
    },
    lime: {
      active: 'bg-brand-lime', 
      inactive: 'bg-brand-lime/30 hover:bg-brand-lime/50'
    }
  }

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={cn(
        'w-2 h-2 rounded-full transition-all duration-300 disabled:cursor-not-allowed relative overflow-hidden',
        isActive 
          ? `${colorStyles[color].active} w-8` 
          : colorStyles[color].inactive
      )}
      aria-label={`Go to item ${index + 1}`}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={false}
        animate={{
          scale: isActive ? 1 : 0,
          opacity: isActive ? 0.3 : 0,
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
        style={{
          background: `radial-gradient(circle, ${color === 'cyan' ? 'rgba(56, 194, 214, 0.4)' : 'rgba(124, 193, 66, 0.4)'} 0%, transparent 70%)`
        }}
      />
    </button>
  )
}
