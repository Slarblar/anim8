'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CalendlyModalProps {
  isOpen: boolean
  onClose: () => void
  calendlyUrl: string
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void
    }
  }
}

export function CalendlyModal({ isOpen, onClose, calendlyUrl }: CalendlyModalProps) {
  useEffect(() => {
    // Load Calendly CSS if not already loaded
    if (!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')) {
      const link = document.createElement('link')
      link.href = 'https://assets.calendly.com/assets/external/widget.css'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }

    // Load Calendly widget script if not already loaded
    if (!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://assets.calendly.com/assets/external/widget.js'
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    // Initialize widget when modal opens
    if (isOpen) {
      const initWidget = () => {
        const widgetElement = document.getElementById('calendly-embed')
        if (widgetElement && window.Calendly) {
          // Clear any existing content
          widgetElement.innerHTML = ''
          // Initialize the widget
          window.Calendly.initInlineWidget({
            url: calendlyUrl,
            parentElement: widgetElement
          })
        }
      }

      // Wait for Calendly to be available
      if (window.Calendly) {
        initWidget()
      } else {
        // Wait for script to load
        const checkCalendly = setInterval(() => {
          if (window.Calendly) {
            clearInterval(checkCalendly)
            initWidget()
          }
        }, 100)

        return () => clearInterval(checkCalendly)
      }
    }
  }, [isOpen, calendlyUrl])

  useEffect(() => {
    // Handle escape key to close modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
          >
            <div className="glass-card w-full h-full max-w-6xl max-h-[900px] relative overflow-hidden border-2 border-brand-lime/30">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-brand-navy/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-lime hover:text-brand-navy transition-all duration-300 hover:scale-110"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Calendly Embed */}
              <div
                id="calendly-embed"
                className="w-full h-full overflow-auto"
                style={{ minWidth: '320px', minHeight: '700px' }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

