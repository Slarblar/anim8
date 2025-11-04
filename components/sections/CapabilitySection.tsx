'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { ModelViewer } from '../ui/ModelViewer'
import { ImageCarousel } from '../ui/ImageCarousel'
import { FiRotateCw, FiZoomIn, FiMove } from 'react-icons/fi'

export function CapabilitySection() {
  // Beauty render images
  const beautyImages = [
    '/images/whatyouget/beauty1.webp',
    '/images/whatyouget/beauty2.webp',
    '/images/whatyouget/beauty3.webp',
    '/images/whatyouget/beauty4.webp',
    '/images/whatyouget/beauty5.webp',
    '/images/whatyouget/beauty6.webp',
    '/images/whatyouget/beauty7.webp',
  ]

  // Wireframe images
  const wireframeImages = [
    '/images/whatyouget/wireframe1.webp',
    '/images/whatyouget/wireframe2.webp',
    '/images/whatyouget/wireframe3.webp',
    '/images/whatyouget/wireframe4.webp',
    '/images/whatyouget/wireframe5.webp',
  ]

  return (
    <Section id="capability" className="bg-background-dark">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">THIS IS WHAT YOU GET</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-12">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl md:text-2xl text-center text-text max-w-4xl mx-auto mb-12">
            From concept to production-ready asset in <span className="text-brand-lime font-bold whitespace-nowrap">3-4 days per character</span>. 
            Timeline varies based on complexity—simple designs at the lower end, highly detailed characters may require additional time. Clean topology, optimized for AI training, production-grade quality.
          </p>

          {/* Adventurous Astronaut Model Preview */}
          <motion.div
            className="flex justify-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="glass-card p-6 max-w-2xl">
              <img
                src="/images/imgi_12_adventurous-astronaut.png"
                alt="Adventurous Astronaut - Production Ready Model"
                className="w-full h-auto rounded-lg"
              />
              <p className="text-center text-text-muted text-sm mt-4 italic">
                Adventurous Astronaut - Our spec piece showcasing production-ready quality
              </p>
            </div>
          </motion.div>

          {/* Interactive Image Carousels */}
          <div className="glass-card p-4 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <ImageCarousel
                images={beautyImages}
                title="Beauty Render"
                subtitle="Adventurous Astronaut"
                autoPlay={false}
              />
              <ImageCarousel
                images={wireframeImages}
                title="Wireframe Overlay"
                subtitle="Clean Topology"
                autoPlay={false}
              />
            </div>
          </div>

          <p className="text-center text-text-muted italic mb-12">
            Introducing our Adventurous Astronaut—a spec piece demonstrating our capability. Your VeeFriends characters will receive this level of craft and detail—at scale.
          </p>

          {/* 3D Model Viewer Instructions */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-text-muted text-sm mb-4">
            <span className="text-brand-cyan font-semibold">Interactive 3D Model:</span>
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

          {/* 3D Model Viewer */}
          <div className="glass-card p-4">
            <ModelViewer 
              src="/models/AdventurousAstronaut_Model_v01.glb"
              alt="Adventurous Astronaut 3D Model"
              autoRotate={true}
              cameraControls={true}
              scale="0.8"
              rotationPerSecond="21deg"
            />
            
            {/* Web optimization note */}
            <div className="mt-4 text-center">
              <p className="text-xs md:text-lg text-text-muted">
                <span className="text-brand-cyan font-medium">Note:</span> Web-optimized version for interactive preview. 
                Production assets delivered at full resolution with enhanced detail.
              </p>
            </div>

            {/* Platform-Agnostic Training Data Callout */}
            <div 
              className="mt-6"
              style={{
                fontSize: '14px',
                fontStyle: 'italic',
                color: 'rgba(255, 255, 255, 0.7)',
                background: 'rgba(124, 193, 66, 0.05)',
                padding: '16px 24px',
                borderLeft: '3px solid #7cc142',
                borderRadius: '4px'
              }}
            >
              <p className="font-semibold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)', fontStyle: 'normal' }}>
                Platform-Agnostic Training Data
              </p>
              <p>
                These production-ready assets work with any AI video generation platform—SORA, Runway, Pika, or future systems. We optimize for clean topology, consistent formatting, and proper metadata to ensure compatibility across training pipelines.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

