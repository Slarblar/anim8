'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useIsTouchDevice } from '@/lib/hooks'

export function Header() {
  const isTouchDevice = useIsTouchDevice()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isLaunching, setIsLaunching] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Check if we're at the top (for positioning)
      setIsAtTop(currentScrollY < 100)

      // If at top of page (within 100px), always show and reset launch state
      if (currentScrollY < 100) {
        setIsVisible(true)
        setIsLaunching(false)
        setLastScrollY(currentScrollY)
        return
      }

      // If scrolling down, hide
      if (currentScrollY > lastScrollY) {
        setIsVisible(false)
      } 
      // If scrolling up, show
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollY])

  const scrollToTop = () => {
    setIsLaunching(true)
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <header 
      className={`fixed left-0 right-0 z-50 px-6 py-6 pointer-events-none transition-all duration-300 ease-out ${
        isAtTop ? 'top-6 md:top-24' : 'top-0'
      }`}
    >
      <div className="container-custom flex items-center justify-center">
        <AnimatePresence>
          {isVisible && (
            <motion.button
              initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.9 }}
              whileHover={!isTouchDevice ? { 
                scale: 1.1,
                transition: { duration: 0.3, ease: 'easeOut' }
              } : {}}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              onClick={scrollToTop}
              className="pointer-events-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-lime/50 focus:ring-offset-2 focus:ring-offset-transparent rounded-full"
              style={{ touchAction: 'manipulation' }}
              aria-label="Scroll to top"
            >
              {/* Glassmorphic Circular Badge */}
              <motion.div 
                className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden shadow-2xl"
                whileHover={!isTouchDevice ? {
                  boxShadow: '0 25px 50px -12px rgba(124, 193, 66, 0.5), 0 0 40px rgba(124, 193, 66, 0.3)'
                } : {}}
              >
                {/* Combined blur and background layer */}
                <div 
                  className="absolute inset-0 rounded-full border-2 border-brand-lime/30 transition-all duration-300"
                  style={{
                    background: 'rgba(20, 26, 46, 0.75)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  }}
                />
                
                {/* Inner glow effect - enhanced on hover */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-brand-lime/20 via-transparent to-brand-cyan/20 rounded-full transition-opacity duration-300"
                  whileHover={!isTouchDevice ? { opacity: 1.5 } : {}}
                />
                
                {/* Subtle vignette to separate from background */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]" />
                
                {/* Hover glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0"
                  whileHover={!isTouchDevice ? { opacity: 1 } : {}}
                  transition={{ duration: 0.3 }}
                  style={{
                    boxShadow: 'inset 0 0 20px rgba(124, 193, 66, 0.4)'
                  }}
                />
                
                {/* Logo */}
                <div className="relative z-10 flex items-center justify-center h-full">
                  <motion.div
                    animate={isLaunching ? { 
                      filter: [
                        'drop-shadow(0 0 8px rgba(124, 193, 66, 0.6))',
                        'drop-shadow(0 0 20px rgba(124, 193, 66, 0.9))',
                        'drop-shadow(0 0 8px rgba(124, 193, 66, 0.6))'
                      ]
                    } : { 
                      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5))'
                    }}
                    transition={isLaunching ? {
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {
                      duration: 0.3
                    }}
                  >
                    <Image
                      src="/images/logos/anim-8-logomark-white-uncompressed.svg"
                      alt="Anim8 Studio"
                      width={60}
                      height={60}
                      className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
                      priority
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

