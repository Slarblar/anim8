'use client'

import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import dynamic from 'next/dynamic'
import { useState } from 'react'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

export function HeroSection() {
  const [isVideoReady, setIsVideoReady] = useState(false)

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Loading Spinner */}
      {!isVideoReady && (
        <div className="absolute inset-0 z-0 bg-brand-navy flex items-center justify-center">
          <div className="relative">
            {/* Spinning ring */}
            <motion.div
              className="w-16 h-16 border-4 border-lime-400/20 border-t-lime-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {/* Pulse effect */}
            <motion.div
              className="absolute inset-0 w-16 h-16 border-4 border-emerald-400/30 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Gumlet Video Background using ReactPlayer */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute top-0 left-0 w-full h-full opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVideoReady ? 0.5 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <ReactPlayer
            url="https://video.gumlet.io/69053299aa9e79860d5f48f8/69068fe7a5b40b283e2e13b7/main.m3u8"
            playing={true}
            loop={true}
            muted={true}
            controls={false}
            width="100%"
            height="100%"
            playsinline={true}
            onReady={() => setIsVideoReady(true)}
            config={{
              file: {
                attributes: {
                  style: {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }
                }
              }
            }}
            style={{
              pointerEvents: 'none',
            }}
          />
        </motion.div>
        
        {/* Overlay for better text contrast */}
        <div className="absolute inset-0 bg-brand-navy/50 backdrop-blur-[2px]" />
      </div>

      {/* Hero Content - Only show after video is ready */}
      {isVideoReady && (
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Main Heading */}
            <h1 className="text-white mb-4 font-black text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              CONTENT INFRASTRUCTURE<br />
              FOR THE AI ERA
            </h1>
            
            {/* Accent Line */}
            <div className="flex justify-center mb-8">
              <div className="h-1 w-24 bg-gradient-to-r from-lime-400 to-emerald-400" />
            </div>

            {/* Subtitle */}
            <motion.p 
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 max-w-4xl mx-auto mb-12 font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              VeeFriends Character Production Pipeline
            </motion.p>

            {/* CTA Button */}
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
      )}

      {/* Scroll Indicator - Only show after video is ready */}
      {isVideoReady && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 10, 0] }}
          transition={{ 
            opacity: { duration: 0.5, delay: 1 },
            y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }
          }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full" />
          </div>
        </motion.div>
      )}
    </section>
  )
}

