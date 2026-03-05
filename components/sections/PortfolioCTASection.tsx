'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { CalendlyModal } from '../ui/CalendlyModal'

const whatToExpect = [
  'Free 30-minute consultation — no strings attached',
  'Discuss your character or pipeline needs in detail',
  'Walk through our production process and timeline',
  'Receive a custom scope and pricing estimate',
]

export function PortfolioCTASection() {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false)

  return (
    <Section id="cta" className="bg-brand-navy relative overflow-hidden">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(124, 193, 66, 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-white mb-4">READY TO BUILD?</h2>

          <div className="flex justify-center mb-8">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl text-text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            Let&apos;s talk about your project. Whether it&apos;s a single hero character or a full IP library, we&apos;ll scope the right approach and timeline for you.
          </p>

          {/* What to expect */}
          <div className="glass-card p-8 mb-10 text-left max-w-xl mx-auto">
            <p className="text-brand-lime font-semibold text-sm tracking-widest uppercase mb-5">
              What to expect:
            </p>
            <ul className="space-y-3">
              {whatToExpect.map((item) => (
                <li key={item} className="flex items-start gap-3 text-text text-sm">
                  <span className="text-brand-lime mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <motion.button
              onClick={() => setIsCalendlyOpen(true)}
              className="w-full sm:w-auto"
              style={{
                background: '#7cc142',
                color: 'white',
                padding: '16px 44px',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: 600,
                border: 'none',
                boxShadow: '0 4px 20px rgba(124, 193, 66, 0.3)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                touchAction: 'manipulation',
              }}
              whileHover={{
                background: '#8bd253',
                scale: 1.02,
                boxShadow: '0 6px 28px rgba(124, 193, 66, 0.45)',
                transition: { duration: 0.3 },
              }}
              whileTap={{ scale: 0.98 }}
              drag={false}
            >
              Schedule a Free Call →
            </motion.button>

            <motion.a
              href="mailto:jordan@anim-8.xyz?subject=Studio%20Inquiry&body=Hi%20Jordan,%0D%0A%0D%0AI%27d%20like%20to%20discuss%20a%20project%20with%20Anim-8.%0D%0A%0D%0AProject%20details:%0D%0A%0D%0AThanks!"
              style={{
                background: 'transparent',
                color: '#38c2d6',
                border: '2px solid #38c2d6',
                padding: '14px 40px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                touchAction: 'manipulation',
              }}
              whileHover={{
                background: 'rgba(56, 194, 214, 0.1)',
                borderColor: '#4dd4e8',
                scale: 1.02,
                boxShadow: '0 4px 16px rgba(56, 194, 214, 0.2)',
                transition: { duration: 0.3 },
              }}
              whileTap={{ scale: 0.98 }}
              drag={false}
            >
              Send an Email →
            </motion.a>
          </div>

          {/* Contact details */}
          <motion.div
            className="text-center"
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.5)',
              lineHeight: '2',
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <a
              href="mailto:jordan@anim-8.xyz"
              style={{ color: '#38c2d6', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              jordan@anim-8.xyz
            </a>
            <span className="mx-3 text-white/20">|</span>
            <a
              href="tel:+19073069306"
              style={{ color: '#38c2d6', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              907-306-9306
            </a>
            <br />
            <span>We typically respond within 2 hours during business hours.</span>
          </motion.div>
        </motion.div>
      </div>

      <CalendlyModal
        isOpen={isCalendlyOpen}
        onClose={() => setIsCalendlyOpen(false)}
        calendlyUrl="https://calendly.com/j-sao/45min?primary_color=7cc142&text_color=ffffff&background_color=0a0f1e"
      />
    </Section>
  )
}
