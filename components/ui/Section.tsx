'use client'

import { motion } from 'framer-motion'
import { ReactNode, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface SectionProps {
  id?: string
  children: ReactNode
  className?: string
  variant?: 'default' | 'gradient'
  style?: CSSProperties
}

export function Section({ 
  id, 
  children, 
  className, 
  variant = 'default',
  style
}: SectionProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'py-16 md:py-24 lg:py-32',
        variant === 'gradient' && 'gradient-bg',
        className
      )}
      style={style}
    >
      {children}
    </motion.section>
  )
}

