'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { Button } from '../ui/Button'

export function HeroSection() {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Ensure iframe loads and autoplays properly on mount
    if (iframeRef.current) {
      const iframe = iframeRef.current
      
      // Ensure iframe is loaded - Gumlet handles autoplay via URL parameters
      const handleLoad = () => {
        // Iframe loaded successfully
        // Autoplay should work via URL parameters: autoplay=true&muted=true&loop=true
      }

      // Add load listener
      iframe.addEventListener('load', handleLoad)

      // Cleanup
      return () => {
        iframe.removeEventListener('load', handleLoad)
      }
    }
  }, [])

  // Generate stable video URL with all required parameters
  const videoUrl = "https://play.gumlet.io/embed/69068fe7a5b40b283e2e13b7?background=true&autoplay=true&loop=true&muted=true&disableControls=true&playsinline=true"

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gumlet Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Video wrapper - responsive with aspect ratio preservation */}
        <div className="absolute inset-0 opacity-50">
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '177.77vh', // 16:9 aspect ratio (100vh * 16/9)
              minWidth: '100vw',
              height: '56.25vw', // 16:9 aspect ratio (100vw * 9/16)  
              minHeight: '100vh',
            }}
          >
            <iframe 
              ref={iframeRef}
              key="gumlet-video-hero"
              title="Gumlet video player"
              src={videoUrl}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              style={{ 
                border: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-brand-navy/50 backdrop-blur-[2px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container-custom text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-white mb-4 font-black text-center">
            CONTENT INFRASTRUCTURE<br />
            FOR THE AI ERA
          </h1>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-8">
            <div className="lime-accent-line" />
          </div>

          <motion.p 
            className="text-xl md:text-2xl lg:text-3xl text-text-light max-w-4xl mx-auto mb-12 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            VeeFriends Character Production Pipeline
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Button 
              variant="primary" 
              size="lg"
              href="#approach"
            >
              See Our Approach
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-2">
          <div className="w-1 h-3 bg-white/50 rounded-full" />
        </div>
      </motion.div>
    </section>
  )
}

