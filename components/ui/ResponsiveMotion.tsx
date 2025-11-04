'use client'

import { motion, MotionProps } from 'framer-motion'
import { useIsTouchDevice } from '@/lib/hooks'
import { forwardRef } from 'react'

interface ResponsiveMotionProps extends MotionProps {
  children: React.ReactNode
  disableHoverOnTouch?: boolean
}

export const ResponsiveMotionDiv = forwardRef<HTMLDivElement, ResponsiveMotionProps>(
  ({ children, whileHover, disableHoverOnTouch = true, ...props }, ref) => {
    const isTouchDevice = useIsTouchDevice()
    
    // Disable hover animations on touch devices
    const effectiveWhileHover = (disableHoverOnTouch && isTouchDevice) ? undefined : whileHover

    return (
      <motion.div
        ref={ref}
        {...props}
        whileHover={effectiveWhileHover}
        drag={false}
        style={{
          touchAction: 'pan-y',
          ...props.style,
        }}
      >
        {children}
      </motion.div>
    )
  }
)

ResponsiveMotionDiv.displayName = 'ResponsiveMotionDiv'

export const ResponsiveMotionButton = forwardRef<HTMLButtonElement, ResponsiveMotionProps>(
  ({ children, whileHover, disableHoverOnTouch = true, ...props }, ref) => {
    const isTouchDevice = useIsTouchDevice()
    
    const effectiveWhileHover = (disableHoverOnTouch && isTouchDevice) ? undefined : whileHover

    return (
      <motion.button
        ref={ref}
        {...props}
        whileHover={effectiveWhileHover}
        drag={false}
        style={{
          touchAction: 'manipulation',
          ...props.style,
        }}
      >
        {children}
      </motion.button>
    )
  }
)

ResponsiveMotionButton.displayName = 'ResponsiveMotionButton'

