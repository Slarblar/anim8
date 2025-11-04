'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  images: string[]
  title: string
  subtitle?: string
  className?: string
  autoPlay?: boolean
  autoPlayDelay?: number
}

export function ImageCarousel({
  images,
  title,
  subtitle,
  className,
  autoPlay = true,
  autoPlayDelay = 4000
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [hasNudged, setHasNudged] = useState(false)

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isHovered || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, autoPlayDelay)

    return () => clearInterval(interval)
  }, [autoPlay, autoPlayDelay, isHovered, images.length])

  // Nudge animation to indicate swipeable content
  useEffect(() => {
    if (images.length <= 1 || hasNudged) return

    const nudgeTimer = setTimeout(() => {
      setHasNudged(true)
    }, 2000) // Show nudge after 2 seconds

    return () => clearTimeout(nudgeTimer)
  }, [images.length, hasNudged])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setHasNudged(true) // Stop nudging after user interaction
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setHasNudged(true) // Stop nudging after user interaction
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setHasNudged(true) // Stop nudging after user interaction
  }

  // Touch/swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && images.length > 1) {
      goToNext()
      setHasNudged(true) // Stop nudging after user interaction
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious()
      setHasNudged(true) // Stop nudging after user interaction
    }
  }

  if (images.length === 0) {
    return (
      <div className={cn('aspect-square bg-gradient-to-br from-brand-lime/20 to-brand-cyan/20 rounded-lg flex items-center justify-center', className)}>
        <p className="text-text-muted text-center">{title}<br/>{subtitle}</p>
      </div>
    )
  }

  return (
    <div 
      className={cn('relative aspect-square rounded-lg overflow-hidden group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main image display */}
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: !hasNudged && images.length > 1 ? [0, -10, 0] : 0
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              duration: 0.5, 
              ease: 'easeInOut',
              x: {
                duration: 1.5,
                repeat: hasNudged ? 0 : Infinity,
                repeatDelay: 3,
                ease: 'easeInOut'
              }
            }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentIndex]}
              alt={`${title} ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
              priority={currentIndex === 0}
            />
            
            {/* Gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
        <h3 className="text-white font-semibold text-lg sm:text-xl mb-1">{title}</h3>
        {subtitle && (
          <p className="text-white/80 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            aria-label="Previous image"
          >
            <FiChevronLeft className="text-white text-xl" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            aria-label="Next image"
          >
            <FiChevronRight className="text-white text-xl" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'bg-brand-lime scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              )}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Touch/swipe indicators on mobile */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 sm:hidden">
        <div className="w-1 h-6 bg-white/20 rounded-full">
          <div 
            className="w-1 bg-brand-lime rounded-full transition-all duration-300"
            style={{ height: `${((currentIndex + 1) / images.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Image counter */}
      <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white text-xs font-medium">
          {currentIndex + 1} / {images.length}
        </span>
      </div>
    </div>
  )
}
