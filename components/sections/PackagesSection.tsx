'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { FaCheck } from 'react-icons/fa'
import { useState } from 'react'
import { CalendlyModal } from '../ui/CalendlyModal'

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: "easeOut"
    }
  })
}

const badgePulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
}

export function PackagesSection() {
  const [isCalendlyOpen, setIsCalendlyOpen] = useState(false)
  
  const packages = [
    {
      id: 'foundation',
      title: 'FOUNDATION',
      subtitle: 'Models Only',
      price: '$25k - $35k',
      complexityNote: 'Based on model complexity and detail level',
      features: [
        'Optimized 3D models',
        'Clean quad topology',
        'Professional materials',
        'Multiple file formats',
      ],
      bestFor: 'Building your character library foundation',
      buttonText: 'Choose Foundation',
      accentColor: '#38c2d6',
      borderColor: 'rgba(56, 194, 214, 0.3)',
    },
    {
      id: 'production-ready',
      title: 'PRODUCTION-READY',
      subtitle: 'Complete AI Training Dataset',
      price: '$55k - $65k',
      complexityNote: 'Pricing varies based on character complexity',
      features: [
        'Everything in Foundation, plus:',
        'Maya/Unreal compatible rigs',
        'FK/IK controls',
        'Basic facial controls',
        'Turntable renders (15 sec each)',
      ],
      bestFor: 'When you\'re ready to add motion for video generation training',
      buttonText: 'Choose Production-Ready',
      accentColor: '#7cc142',
      borderColor: 'rgba(124, 193, 66, 0.4)',
    },
    {
      id: 'comprehensive',
      title: 'COMPREHENSIVE',
      subtitle: 'Maximum Training Variation',
      price: '$110k - $125k',
      complexityNote: 'Final cost depends on animation complexity',
      features: [
        'Everything in Production-Ready, plus:',
        '5-8 animations per character',
        'Multiple camera angles',
        'Lighting variations',
        'Comprehensive training dataset',
      ],
      bestFor: 'Complete training datasets with maximum variation',
      buttonText: 'Choose Comprehensive',
      accentColor: '#8B5CF6',
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
  ]

  return (
    <Section id="packages" className="bg-background-dark relative overflow-hidden">
      {/* Gradient orbs (light blooms) */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="gradient-orb gradient-orb-1" style={{ top: '10%', left: '-5%' }} />
        <div className="gradient-orb gradient-orb-2" style={{ top: '60%', right: '-10%' }} />
      </div>

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
          <h2 className="text-center mb-4 text-white">CHOOSE YOUR APPROACH</h2>
          
          {/* Subtitle */}
          <p className="text-center text-text text-lg mb-3">
            Speed can be Increased with Higher Deposit
          </p>

          {/* Global complexity explanation */}
          <p 
            className="text-center mb-6"
            style={{
              fontSize: '15px',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: '1.6'
            }}
          >
            Pricing reflects character complexity - from simple designs to highly detailed characters
          </p>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          {/* Start With Foundation Section */}
          <div 
            className="mx-auto mb-8 md:mb-12 text-center px-5 py-6 md:px-10 md:py-8"
            style={{
              maxWidth: '700px',
              background: 'rgba(124, 193, 66, 0.05)',
              border: '1px solid rgba(124, 193, 66, 0.15)',
              borderRadius: '12px',
              lineHeight: '1.7'
            }}
          >
            <h3 
              className="text-white mb-4 text-xl md:text-2xl"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600
              }}
            >
              Start With Foundation, Scale As Needed
            </h3>
            <p 
              className="text-[15px] md:text-base"
              style={{ color: 'rgba(255, 255, 255, 0.75)' }}
            >
              Most clients begin with Package A to establish their character library foundation, then upgrade to rigging and animation as production needs evolve. This approach allows you to validate quality and pipeline before scaling to full production.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative"
                drag={false}
              >
                <motion.div
                  className="glass-card h-full flex flex-col p-8 md:p-10 relative overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    border: `1.5px solid ${pkg.borderColor}`,
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    touchAction: 'pan-y',
                  }}
                  drag={false}
                  whileHover={{
                    scale: 1.01,
                    boxShadow: '0 8px 40px rgba(0, 0, 0, 0.3)',
                    borderColor: pkg.accentColor,
                    transition: { duration: 0.3 }
                  }}
                >

                  {/* Header */}
                  <div className="text-center mb-8 mt-8">
                    <h3 
                      className="text-white mb-2 text-2xl font-bold"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {pkg.title}
                    </h3>
                    <p 
                      className="text-lg font-semibold mb-6"
                      style={{ color: pkg.accentColor }}
                    >
                      {pkg.subtitle}
                    </p>
                    
                    {/* Price */}
                    <p 
                      className="font-bold mb-2 text-3xl sm:text-4xl md:text-[42px]"
                      style={{
                        fontWeight: 700,
                        letterSpacing: '-1px',
                        paddingBottom: '4px',
                        color: 'white'
                      }}
                    >
                      {pkg.price}
                    </p>
                    <p 
                      className="mt-2"
                      style={{ 
                        fontSize: '15px', 
                        color: 'rgba(255, 255, 255, 0.7)' 
                      }}
                    >
                      50 Characters
                    </p>
                    
                    {/* Complexity Note */}
                    <p 
                      className="mt-2"
                      style={{ 
                        fontSize: '13px', 
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontStyle: 'italic'
                      }}
                    >
                      {pkg.complexityNote}
                    </p>
                  </div>

                  {/* What's Included */}
                  <div className="flex-grow mb-8">
                    <h4 
                      className="font-bold mb-4 uppercase"
                      style={{ 
                        fontSize: '14px',
                        color: pkg.accentColor,
                        letterSpacing: '1.5px',
                        fontFamily: 'Montserrat, sans-serif'
                      }}
                    >
                      What&apos;s Included:
                    </h4>
                    <ul className="space-y-3">
                      {pkg.features.map((feature, i) => (
                        <li 
                          key={i} 
                          className="flex items-start"
                          style={{ 
                            fontSize: '15px',
                            lineHeight: '1.6'
                          }}
                        >
                          {feature.includes('plus:') || feature.includes('Everything') ? (
                            <span className="font-semibold text-white">{feature}</span>
                          ) : (
                            <>
                              <FaCheck 
                                className="mt-1 mr-3 flex-shrink-0" 
                                style={{ color: pkg.accentColor, fontSize: '12px' }}
                              />
                              <span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                                {feature}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Best For */}
                  <div 
                    className="mb-6 pt-5"
                    style={{ 
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      marginTop: '20px'
                    }}
                  >
                    <p 
                      className="mb-2 font-semibold"
                      style={{ 
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    >
                      Best For:
                    </p>
                    <p 
                      className="italic"
                      style={{ 
                        fontSize: '14px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: '1.5'
                      }}
                    >
                      {pkg.bestFor}
                    </p>
                  </div>

                  {/* Button */}
                  <motion.button
                    onClick={() => {
                      // Update URL with package parameter
                      window.history.pushState({}, '', `#cta?package=${pkg.id}`)
                      // Trigger hashchange event for CTA section to update
                      window.dispatchEvent(new HashChangeEvent('hashchange'))
                      // Smooth scroll to CTA section
                      const ctaSection = document.getElementById('cta')
                      if (ctaSection) {
                        ctaSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    className="w-full text-center py-4 px-8 rounded-lg font-semibold cursor-pointer"
                    style={{
                      background: pkg.accentColor,
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      display: 'block',
                      border: 'none',
                      touchAction: 'manipulation'
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 8px 24px ${pkg.accentColor}50`,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {pkg.buttonText}
                  </motion.button>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Footer note */}
          <motion.div
            className="text-center mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '32px',
              marginTop: '60px',
              maxWidth: '1100px'
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            <p style={{ fontSize: '15px', color: 'rgba(255, 255, 255, 0.7)' }}>
              All packages include: <span className="text-white font-semibold">Weekly reviews</span> <span style={{ color: '#7cc142' }}>•</span> <span className="text-white font-semibold">Priority support</span> <span style={{ color: '#7cc142' }}>•</span> <span className="text-white font-semibold">2 revision rounds per character</span> <span style={{ color: '#7cc142' }}>•</span> <span className="text-white font-semibold">Delivery within 14-17 weeks</span>
            </p>
          </motion.div>

          {/* Flexible Upgrade Path Callout */}
          <motion.div
            className="mx-auto px-6 py-5 md:px-9 md:py-7 text-left mt-10"
            style={{
              background: 'rgba(56, 194, 214, 0.05)',
              border: '1px solid rgba(56, 194, 214, 0.2)',
              borderRadius: '12px',
              maxWidth: '800px'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
          >
            <h3 
              className="text-base md:text-lg mb-3"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                color: '#38c2d6'
              }}
            >
              ⚡ Flexible Upgrade Path
            </h3>
            <p 
              className="text-sm md:text-[15px] mb-3"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.7'
              }}
            >
              Start with Foundation and upgrade to Production-Ready or Comprehensive at any time. We'll credit your initial investment toward the upgraded package.
            </p>
            <p 
              className="text-sm md:text-[15px] mb-2"
              style={{
                fontFamily: 'Montserrat, sans-serif',
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.7'
              }}
            >
              This allows you to:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className="text-sm mb-2 pl-5 relative" style={{ color: '#38c2d6' }}>
                <span style={{ position: 'absolute', left: 0 }}>•</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Test quality and speed with lower commitment</span>
              </li>
              <li className="text-sm mb-2 pl-5 relative" style={{ color: '#38c2d6' }}>
                <span style={{ position: 'absolute', left: 0 }}>•</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Validate pipeline before scaling to full production</span>
              </li>
              <li className="text-sm pl-5 relative" style={{ color: '#38c2d6' }}>
                <span style={{ position: 'absolute', left: 0 }}>•</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Add motion capabilities when video generation becomes priority</span>
              </li>
            </ul>
          </motion.div>

          {/* Consultation CTA */}
          <motion.div
            className="mx-auto text-center"
            style={{
              background: 'rgba(124, 193, 66, 0.05)',
              border: '1px solid rgba(124, 193, 66, 0.2)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '800px',
              marginTop: '60px'
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <h3 
              className="text-white font-semibold mb-3"
              style={{ fontSize: '24px' }}
            >
              Not sure which approach fits your needs best?
            </h3>
            <p 
              className="mb-6"
              style={{ 
                fontSize: '16px', 
                color: 'rgba(255, 255, 255, 0.8)',
                lineHeight: '1.6'
              }}
            >
              Schedule a 15-minute consultation to discuss your specific requirements and timeline.
            </p>
            <motion.button
              onClick={() => setIsCalendlyOpen(true)}
              className="inline-block"
              style={{
                background: '#7cc142',
                color: 'white',
                padding: '14px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
              whileHover={{
                background: '#8bd253',
                boxShadow: '0 8px 24px rgba(124, 193, 66, 0.4)',
                transition: { duration: 0.3 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              Schedule Consultation →
            </motion.button>
          </motion.div>
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
