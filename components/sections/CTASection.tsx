'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CalendlyModal } from '../ui/CalendlyModal'

export function CTASection() {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false)

  return (
    <Section id="cta" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">LET{`'`}S BUILD THIS</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          {/* Recommended Package */}
          <Card variant="lime" className="max-w-4xl mx-auto mb-12">
            <div className="text-center mb-8">
              <span className="inline-block bg-brand-lime text-brand-navy font-bold px-4 py-2 rounded-full text-sm mb-4">
                RECOMMENDED STARTING POINT
              </span>
              <h3 className="text-white mb-2">Package B (Production-Ready)</h3>
              <p className="text-text-muted">50 characters with rigs and turntables</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <p className="text-brand-lime font-bold text-3xl mb-2">$45k-70k</p>
                <p className="text-text-muted text-sm">Investment</p>
              </div>
              <div className="text-center">
                <p className="text-brand-cyan font-bold text-3xl mb-2">12 weeks</p>
                <p className="text-text-muted text-sm">Timeline</p>
              </div>
              <div className="text-center">
                <p className="text-brand-pink font-bold text-3xl mb-2">50</p>
                <p className="text-text-muted text-sm">Characters</p>
              </div>
            </div>

            <div className="section-divider mb-8" />

            <h4 className="text-white font-bold mb-4">Payment Structure:</h4>
            <ul className="space-y-3 mb-8 text-text">
              <li className="flex justify-between">
                <span>40% deposit to begin</span>
                <span className="font-bold text-brand-lime">$18k-28k</span>
              </li>
              <li className="flex justify-between">
                <span>35% at 25 characters delivered</span>
                <span className="font-bold text-brand-cyan">$15.75k-24.5k</span>
              </li>
              <li className="flex justify-between">
                <span>25% upon final delivery</span>
                <span className="font-bold text-brand-pink">$11.25k-17.5k</span>
              </li>
            </ul>

            <div className="bg-brand-lime/10 border border-brand-lime/30 rounded-lg p-6 mb-8">
              <h4 className="text-white font-bold mb-4">What Happens Next:</h4>
              <ol className="space-y-2 text-text-muted">
                <li>1. Schedule kickoff call</li>
                <li>2. Review 2D concepts together of selected characters</li>
                <li>3. Sign agreement & deposit</li>
                <li>4. Begin pre-production (Week 1)</li>
                <li>5. First character batch delivered (Week 3)</li>
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="cyan" 
                size="lg"
                onClick={() => setIsCalendlyOpen(true)}
              >
                Schedule Kickoff Call
              </Button>
              <Button variant="secondary" size="lg">
                Download Full Proposal (PDF)
              </Button>
            </div>
          </Card>

          {/* Contact Info */}
          <div className="glass-card p-8 max-w-2xl mx-auto text-center">
            <h3 className="text-white mb-4">Questions?</h3>
            <p className="text-text mb-4">Email us directly:</p>
            <a href="mailto:jordan@anim-8.xyz" className="text-brand-lime font-bold text-xl hover:text-brand-cyan transition-colors">
              jordan@anim-8.xyz
            </a>
            <p className="text-text-muted mt-4 mb-2">Or text/call:</p>
            <a href="tel:+19073069306" className="text-brand-cyan font-bold text-xl hover:text-brand-lime transition-colors">
              907-306-9306
            </a>
            <p className="text-text-muted text-sm mt-6">
              We typically respond within 2 hours during business hours.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Calendly Modal */}
      <CalendlyModal
        isOpen={isCalendlyOpen}
        onClose={() => setIsCalendlyOpen(false)}
        calendlyUrl="https://calendly.com/j-sao/45min?primary_color=7cc142&text_color=ffffff&background_color=0a0f1e"
      />
    </Section>
  )
}

