'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'

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
          <div className="flex justify-center mb-12">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl md:text-2xl text-center text-text max-w-4xl mx-auto mb-16">
            From concept to production-ready asset in <span className="text-brand-lime font-bold">48 hours</span>. 
            Clean topology. Optimized for animation and rendering. Production-grade.
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

          {/* Video turntable placeholder */}
          <div className="glass-card p-4">
            <div className="aspect-video bg-gradient-to-br from-brand-cyan/20 to-brand-lime/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">▶️</div>
                <p className="text-text-muted">10-Second Turntable Video<br/>Auto-plays on scroll</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

