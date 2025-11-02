'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

export function TimelineSection() {
  const phases = [
    {
      phase: 'PHASE 1',
      timeframe: 'WEEK 1-2',
      title: 'Pre-Production',
      items: [
        'Style guide',
        '3 hero models',
        'Client approval',
      ],
    },
    {
      phase: 'PHASE 2',
      timeframe: 'WEEK 3-8',
      title: 'Production',
      items: [
        '8-10 characters per week (Speed can be increased with higher deposit)',
        'Weekly reviews',
        'Rapid iteration',
      ],
    },
    {
      phase: 'PHASE 3',
      timeframe: 'WEEK 9-12',
      title: 'Delivery',
      items: [
        'QC & polish',
        'Full dataset',
        'Documentation',
      ],
    },
  ]

  return (
    <Section id="timeline" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">PILOT: 50 CHARACTERS</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-8">
            <div className="lime-accent-line" />
          </div>
          
          <motion.p 
            className="text-xl text-center text-text max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            We can start with 50 to validate the pipeline, then scale to your full library.
          </motion.p>

          {/* Timeline */}
          <div className="relative mb-16">
            {/* Animated connecting line */}
            <motion.div 
              className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-lime/30 via-brand-cyan/50 to-brand-lime/30" 
              style={{ top: '60px' }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
            />

            <motion.div 
              className="grid md:grid-cols-3 gap-8 relative"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.3
                  }
                }
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {phases.map((phase, index) => (
                <motion.div
                  key={phase.phase}
                  variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  {/* Phase circle with bounce animation */}
                  <div className="flex justify-center mb-6">
                    <motion.div 
                      className="w-24 h-24 rounded-full glass-card border-2 border-brand-lime flex items-center justify-center bg-brand-lime/10 relative z-10"
                      initial={{ scale: 0, rotate: -180 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.5 + (index * 0.3)
                      }}
                    >
                      <motion.span 
                        className="text-3xl font-black text-brand-lime"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + (index * 0.3) }}
                      >
                        {index + 1}
                      </motion.span>
                    </motion.div>
                  </div>

                  <Card hover={false} className="text-center">
                    <p className="text-brand-lime font-bold text-sm mb-1">{phase.phase}</p>
                    <p className="text-brand-cyan text-sm mb-3">{phase.timeframe}</p>
                    <h3 className="text-white mb-4">{phase.title}</h3>
                    <motion.ul 
                      className="space-y-2 text-text-muted"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: 0.1
                          }
                        }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                      {phase.items.map((item, i) => (
                        <motion.li 
                          key={i}
                          variants={{
                            hidden: { opacity: 0, x: -20 },
                            visible: { opacity: 1, x: 0 }
                          }}
                        >
                          • {item}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Summary */}
          <motion.div 
            className="glass-card p-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h3 className="text-white text-center mb-6">
              Timeline: <span className="text-brand-lime">12 weeks</span> from kickoff to delivery
            </h3>
            <div className="section-divider mb-6" />
            <h4 className="text-white font-bold mb-4">What You&apos;ll Receive:</h4>
            <motion.ul 
              className="space-y-3 text-text mb-6"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                '50 production-ready 3D characters',
                'Clean topology (optimized for rigging/animation)',
                'Professional materials and textures',
                'Multiple export formats (FBX, OBJ, USD)',
                'Organized file structure and documentation',
                'Weekly progress reviews with video updates',
              ].map((item, i) => (
                <motion.li 
                  key={i}
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-brand-lime mr-3">✓</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  )
}
