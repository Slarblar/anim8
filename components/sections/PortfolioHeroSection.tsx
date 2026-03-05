'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Button } from '../ui/Button'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

export function PortfolioHeroSection() {
  const [isVideoReady, setIsVideoReady] = useState(false)

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden w-full max-w-full">
      {/* Loading spinner */}
      {!isVideoReady && (
        <div className="absolute inset-0 z-0 bg-brand-navy flex items-center justify-center">
          <div className="relative">
            <motion.div
              className="w-16 h-16 border-4 border-lime-400/20 border-t-lime-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-0 w-16 h-16 border-4 border-emerald-400/30 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Video background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute top-0 left-0 w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVideoReady ? 0.45 : 0 }}
          transition={{ duration: 0.8 }}
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
                  },
                },
              },
            }}
            style={{ pointerEvents: 'none' }}
          />
        </motion.div>
        <div className="absolute inset-0 bg-brand-navy/55 backdrop-blur-[1px]" />
      </div>

      {/* Hero content */}
      <div className={`relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center transition-opacity duration-700 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isVideoReady ? 1 : 0, y: isVideoReady ? 0 : 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Eyebrow */}
          <motion.p
            className="text-brand-lime font-semibold tracking-[0.25em] text-sm uppercase mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: isVideoReady ? 1 : 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            3D Character Production Studio
          </motion.p>

          {/* Main headline */}
          <h1 className="text-white mb-4 font-black text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl px-4 max-w-full break-words">
            PRODUCTION-READY<br />
            <span className="gradient-text-simple">CHARACTERS. AT SCALE.</span>
          </h1>

          {/* Accent line */}
          <div className="flex justify-center mb-8">
            <div className="h-1 w-24 bg-gradient-to-r from-brand-lime to-brand-cyan" />
          </div>

          {/* Subheadline */}
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-white/75 max-w-3xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: isVideoReady ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{ fontFamily: 'futura-pt-book, futura-pt, sans-serif', fontWeight: 400 }}
          >
            Full-pipeline 3D character studio — modeling, rigging, animation, and rendering — for IP owners, gaming studios, and entertainment brands.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isVideoReady ? 1 : 0, y: isVideoReady ? 0 : 20 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <Button variant="primary" size="lg" href="#work">
              See Our Work
            </Button>
            <Button variant="outline" size="lg" href="#cta" icon={false}>
              Book a Free Call
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: isVideoReady ? 1 : 0, y: [0, 10, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 1.2 },
          y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.2 },
        }}
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-2">
          <div className="w-1 h-3 bg-white/50 rounded-full" />
        </div>
      </motion.div>
    </section>
  )
}
