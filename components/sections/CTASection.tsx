'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { CalendlyModal } from '../ui/CalendlyModal'

const packageData = {
  foundation: {
    name: 'Foundation',
    subtitle: 'Models Only',
    price: '$25k - $35k',
    characters: 50,
    timeline: '10 weeks',
    recommended: false,
    accentColor: '#38c2d6',
    variant: 'cyan' as const,
    deposit: { amount: '$10k - $14k', percent: '40%' },
    milestone: { amount: '$8.75k - $12.25k', percent: '35%' },
    final: { amount: '$6.25k - $8.75k', percent: '25%' }
  },
  'production-ready': {
    name: 'Production-Ready',
    subtitle: 'Complete AI Training Dataset',
    price: '$55k - $65k',
    characters: 50,
    timeline: '14-17 weeks',
    recommended: true,
    accentColor: '#7cc142',
    variant: 'lime' as const,
    deposit: { amount: '$22k - $26k', percent: '40%' },
    milestone: { amount: '$19.25k - $22.75k', percent: '35%' },
    final: { amount: '$13.75k - $16.25k', percent: '25%' }
  },
  comprehensive: {
    name: 'Comprehensive',
    subtitle: 'Maximum Training Variation',
    price: '$110k - $125k',
    characters: 50,
    timeline: '14 weeks',
    recommended: false,
    accentColor: '#8B5CF6',
    variant: 'pink' as const,
    deposit: { amount: '$44k - $50k', percent: '40%' },
    milestone: { amount: '$38.5k - $43.75k', percent: '35%' },
    final: { amount: '$27.5k - $31.25k', percent: '25%' }
  }
}

export function CTASection() {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<keyof typeof packageData>('production-ready')

  useEffect(() => {
    // Read package from URL hash
    const handleHashChange = () => {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.split('?')[1] || '')
      const packageParam = params.get('package') as keyof typeof packageData
      
      if (packageParam && packageData[packageParam]) {
        setSelectedPackage(packageParam)
      }
    }

    handleHashChange() // Check on mount
    window.addEventListener('hashchange', handleHashChange)
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const pkg = packageData[selectedPackage]

  return (
    <Section id="cta" className="bg-brand-navy relative overflow-hidden">
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container-custom relative z-10">
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

          {/* Dynamic Package Card */}
          <Card variant={pkg.variant} className="max-w-4xl mx-auto mb-12">
            <div className="text-center mb-8">
              {pkg.recommended && (
                <span className="inline-block bg-brand-lime text-brand-navy font-bold px-4 py-2 rounded-full text-sm mb-4">
                  RECOMMENDED STARTING POINT
                </span>
              )}
              <h3 className="text-white mb-2">{pkg.name}</h3>
              <p className="text-text-muted">{pkg.subtitle}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <p 
                  className="font-bold text-3xl mb-2"
                  style={{ color: pkg.accentColor }}
                >
                  {pkg.price}
                </p>
                <p className="text-text-muted text-sm">Investment</p>
              </div>
              <div className="text-center">
                <p className="text-brand-cyan font-bold text-3xl mb-2">{pkg.timeline}</p>
                <p className="text-text-muted text-sm">Timeline</p>
              </div>
              <div className="text-center">
                <p className="text-brand-pink font-bold text-3xl mb-2">{pkg.characters}</p>
                <p className="text-text-muted text-sm">Characters</p>
              </div>
            </div>

            <div className="section-divider mb-8" />

            <h4 className="text-white font-bold mb-4">Payment Structure:</h4>
            <ul className="space-y-3 mb-8 text-text">
              <li className="flex justify-between">
                <span>{pkg.deposit.percent} deposit to begin</span>
                <span 
                  className="font-bold"
                  style={{ color: pkg.accentColor }}
                >
                  {pkg.deposit.amount}
                </span>
              </li>
              <li className="flex justify-between">
                <span>{pkg.milestone.percent} at 25 characters delivered</span>
                <span className="font-bold text-brand-cyan">{pkg.milestone.amount}</span>
              </li>
              <li className="flex justify-between">
                <span>{pkg.final.percent} upon final delivery</span>
                <span className="font-bold text-brand-pink">{pkg.final.amount}</span>
              </li>
            </ul>

            <div 
              className="rounded-lg p-6 mb-8"
              style={{
                background: `${pkg.accentColor}10`,
                border: `1px solid ${pkg.accentColor}30`
              }}
            >
              <h4 className="text-white font-bold mb-4">What Happens Next:</h4>
              <ol className="space-y-2 text-text-muted">
                <li>1. Schedule kickoff call</li>
                <li>2. Review 2D concepts together of selected characters</li>
                <li>3. Sign agreement & deposit</li>
                <li>4. Begin pre-production (Week 1)</li>
                <li>5. First character batch delivered (Week 3)</li>
              </ol>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col md:flex-row gap-5 justify-center items-center mt-10 mb-8">
              {/* Primary Button */}
              <motion.button
                onClick={() => setIsCalendlyOpen(true)}
                className="btn-primary"
                style={{
                  background: '#7cc142',
                  color: 'white',
                  padding: '16px 40px',
                  borderRadius: '8px',
                  fontSize: '17px',
                  fontWeight: 600,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(124, 193, 66, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: '300px',
                  whiteSpace: 'nowrap',
                  touchAction: 'manipulation'
                }}
                drag={false}
                whileHover={{
                  background: '#8bd253',
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(124, 193, 66, 0.4)',
                  transition: { duration: 0.3 }
                }}
                whileTap={{
                  scale: 0.98,
                  boxShadow: '0 2px 8px rgba(124, 193, 66, 0.3)'
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                aria-label="Schedule a kickoff call to discuss VeeFriends production"
              >
                Schedule Kickoff Call →
              </motion.button>

              {/* Secondary Button */}
              <motion.a
                href="mailto:jordan@anim-8.xyz?subject=VeeFriends%20Character%20Production%20Question&body=Hi%20Jordan,%0D%0A%0D%0AI%20reviewed%20the%20VeeFriends%20character%20production%20proposal%20and%20have%20a%20question:%0D%0A%0D%0A[Your%20question%20here]%0D%0A%0D%0AThanks!"
                className="btn-secondary"
                style={{
                  background: 'transparent',
                  color: '#38c2d6',
                  border: '2px solid #38c2d6',
                  padding: '14px 36px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  display: 'inline-block',
                  textAlign: 'center',
                  width: '100%',
                  maxWidth: '280px',
                  whiteSpace: 'nowrap',
                  touchAction: 'manipulation'
                }}
                drag={false}
                whileHover={{
                  background: 'rgba(56, 194, 214, 0.1)',
                  borderColor: '#4dd4e8',
                  scale: 1.02,
                  boxShadow: '0 4px 12px rgba(56, 194, 214, 0.2)',
                  transition: { duration: 0.3 }
                }}
                whileTap={{
                  background: 'rgba(56, 194, 214, 0.15)',
                  scale: 0.98
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                aria-label="Send us an email with your questions"
              >
                Ask a Question →
              </motion.a>
            </div>

            {/* Contact Info Below Buttons */}
            <motion.div
              className="text-center"
              style={{
                fontSize: '15px',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.8',
                marginTop: '32px',
                fontWeight: 500
              }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p>
                Questions? Email us directly:{' '}
                <a 
                  href="mailto:jordan@anim-8.xyz"
                  style={{
                    color: '#38c2d6',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  jordan@anim-8.xyz
                </a>
                <br />
                Or text/call:{' '}
                <a 
                  href="tel:+19073069306"
                  style={{
                    color: '#38c2d6',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  907-306-9306
                </a>
                <br />
                <br />
                We typically respond within 2 hours during business hours.
              </p>
            </motion.div>
          </Card>
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

