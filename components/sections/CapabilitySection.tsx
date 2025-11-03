'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { ModelViewer } from '../ui/ModelViewer'
import { FiRotateCw, FiZoomIn, FiMove } from 'react-icons/fi'

export function CapabilitySection() {
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

          <p className="text-xl md:text-2xl text-center text-text max-w-4xl mx-auto mb-16">
            From concept to production-ready asset in <span className="text-brand-lime font-bold whitespace-nowrap">3-4 days</span>. 
            Clean topology, optimized for AI training, production-grade quality.
          </p>

          {/* Split-screen image placeholder */}
          <div className="glass-card p-4 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="aspect-square bg-gradient-to-br from-brand-lime/20 to-brand-cyan/20 rounded-lg flex items-center justify-center">
                <p className="text-text-muted">Beauty Render<br/>Astronaut Character</p>
              </div>
              <div className="aspect-square bg-gradient-to-br from-brand-pink/20 to-brand-navy/40 rounded-lg flex items-center justify-center">
                <p className="text-text-muted">Wireframe Overlay<br/>Clean Topology</p>
              </div>
            </div>
          </div>

          <p className="text-center text-text-muted italic mb-12">
            This was a spec piece to prove our capability. Your VeeFriends characters will receive this level of craft—at scale.
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
              src="/models/Anim-8_EdenOffline_CeramicSupra_Decimate_Final.glb"
              alt="Anim-8 Character 3D Model"
              autoRotate={true}
              cameraControls={true}
            />
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

