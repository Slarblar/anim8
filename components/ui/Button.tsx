'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  icon?: boolean
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  href,
  icon = true,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-300 focus-lime disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden'
  
  const variants = {
    primary: 'glass-button-primary',
    secondary: 'glass-button-secondary',
    tertiary: 'glass-button-tertiary',
    outline: 'border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40 backdrop-blur-[10px]',
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg',
  }

  const pulseAnimation = variant === 'primary' ? {
    boxShadow: [
      '0 4px 20px rgba(124, 193, 66, 0.2)',
      '0 4px 30px rgba(124, 193, 66, 0.4)',
      '0 4px 20px rgba(124, 193, 66, 0.2)',
    ],
  } : {}

  const content = (
    <>
      {children}
      {icon && variant === 'primary' && (
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          →
        </motion.span>
      )}
    </>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ 
          y: -4,
          scale: 1.02,
        }}
        whileTap={{ scale: 0.98 }}
        animate={pulseAnimation}
        transition={{ 
          y: { duration: 0.3 },
          scale: { duration: 0.2 },
          boxShadow: { duration: 2, repeat: Infinity }
        }}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      whileHover={{ 
        y: -4,
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      animate={pulseAnimation}
      transition={{ 
        y: { duration: 0.3 },
        scale: { duration: 0.2 },
        boxShadow: { duration: 2, repeat: Infinity }
      }}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {content}
    </motion.button>
  )
}
