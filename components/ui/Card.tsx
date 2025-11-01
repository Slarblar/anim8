'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = true }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -5 } : {}}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-xl bg-background-light border border-text-muted/10 p-6 backdrop-blur-sm',
        hover && 'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

