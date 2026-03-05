'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Section } from '../ui/Section'
import { ImageCarousel } from '../ui/ImageCarousel'
import { ModelViewer } from '../ui/ModelViewer'
import { FiRotateCw, FiZoomIn, FiMove } from 'react-icons/fi'

const characterPreviews = [
  { src: '/images/preview-astronaut.png', alt: 'Adventurous Astronaut' },
  { src: '/images/preview-phoenix.png', alt: 'Phoenix Character' },
  { src: '/images/preview-bee.png', alt: 'Bee Character' },
  { src: '/images/preview-fox.png', alt: 'Fox Character' },
  { src: '/images/preview-bobcat.png', alt: 'Bobcat Character' },
  { src: '/images/preview-dog.png', alt: 'Dog Character' },
]

const beautyImages = [
  '/images/whatyouget/beauty1.webp',
  '/images/whatyouget/beauty2.webp',
  '/images/whatyouget/beauty3.webp',
  '/images/whatyouget/beauty4.webp',
  '/images/whatyouget/beauty5.webp',
  '/images/whatyouget/beauty6.webp',
  '/images/whatyouget/beauty7.webp',
]

const wireframeImages = [
  '/images/whatyouget/wireframe1.webp',
  '/images/whatyouget/wireframe2.webp',
  '/images/whatyouget/wireframe3.webp',
  '/images/whatyouget/wireframe4.webp',
  '/images/whatyouget/wireframe5.webp',
]

export function PortfolioWorkSection() {
  return (
    <Section id="work" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">OUR WORK</h2>

          {/* Lime accent line */}
          <div className="flex justify-center mb-6">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl md:text-2xl text-center text-text max-w-3xl mx-auto mb-16">
            From concept to{' '}
            <span className="text-brand-lime font-bold">production-ready asset in 3–4 days per character</span>.
            Clean topology, game-ready geometry, and production-grade materials — built to last.
          </p>

          {/* Character preview grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-16">
            {characterPreviews.map((char, index) => (
              <motion.div
                key={char.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="glass-card overflow-hidden group aspect-square relative"
              >
                <Image
                  src={char.src}
                  alt={char.alt}
                  fill
                  className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              </motion.div>
            ))}
          </div>

          {/* Carousels: Beauty + Wireframe */}
          <motion.div
            className="glass-card p-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="grid md:grid-cols-2 gap-4">
              <ImageCarousel
                images={beautyImages}
                title="Beauty Renders"
                subtitle="Production-grade quality"
                autoPlay={false}
              />
              <ImageCarousel
                images={wireframeImages}
                title="Wireframe"
                subtitle="Clean topology"
                autoPlay={false}
              />
            </div>
          </motion.div>

          {/* 3D Interactive Model */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-text-muted text-sm mb-4">
              <span className="text-brand-cyan font-semibold">Interactive 3D Preview:</span>
              <span className="flex items-center gap-1.5">
                <FiRotateCw className="text-brand-lime" />
                Click and drag to rotate
              </span>
              <span className="flex items-center gap-1.5">
                <FiZoomIn className="text-brand-cyan" />
                Scroll to zoom
              </span>
              <span className="flex items-center gap-1.5">
                <FiMove className="text-brand-pink" />
                Right-click to pan
              </span>
            </div>

            <div className="glass-card p-4">
              <ModelViewer
                src="/models/AdventurousAstronaut_Model_v01.glb"
                alt="Adventurous Astronaut 3D Model"
                autoRotate={true}
                cameraControls={true}
                scale="0.8"
                rotationPerSecond="21deg"
              />

              <div className="mt-4 text-center">
                <p className="text-xs md:text-sm text-text-muted">
                  <span className="text-brand-cyan font-medium">Note:</span>{' '}
                  Web-optimized version for preview. Production assets delivered at full resolution with enhanced detail.
                </p>
              </div>

              <div
                className="mt-6"
                style={{
                  fontSize: '14px',
                  fontStyle: 'italic',
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'rgba(124, 193, 66, 0.05)',
                  padding: '16px 24px',
                  borderLeft: '3px solid #7cc142',
                  borderRadius: '4px',
                }}
              >
                <p
                  className="font-semibold mb-2"
                  style={{ color: 'rgba(255, 255, 255, 0.9)', fontStyle: 'normal' }}
                >
                  Multi-Format Delivery
                </p>
                <p>
                  Every asset ships with clean quad topology, professional PBR materials, and organized file exports in FBX, OBJ, and USD. Compatible with Unreal Engine, Unity, Maya, and any production pipeline your team already uses.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  )
}
