'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

export function PackagesSection() {
  const packages = [
    {
      id: 'a',
      title: 'PACKAGE A',
      subtitle: 'Models Only',
      price: '$20,000-35,000',
      priceMin: 20000,
      priceMax: 35000,
      features: [
        'Optimized 3D models',
        'Clean quad topology',
        'Professional materials',
        'Multiple file formats',
      ],
      bestFor: 'Teams with in-house rigging & animation',
      buttonVariant: 'secondary' as const,
      buttonText: 'Select Package A',
    },
    {
      id: 'b',
      title: 'PACKAGE B',
      subtitle: 'Production-Ready',
      price: '$45,000-70,000',
      priceMin: 45000,
      priceMax: 70000,
      features: [
        'Everything in Package A, plus:',
        'Maya/Unreal compatible rigs',
        'FK/IK controls',
        'Basic facial controls',
        'Turntable renders (15 sec each)',
      ],
      bestFor: 'Complete SORA training dataset with motion',
      recommended: true,
      buttonVariant: 'primary' as const,
      buttonText: 'Select Package B',
      variant: 'lime' as const,
    },
    {
      id: 'c',
      title: 'PACKAGE C',
      subtitle: 'Complete Training Dataset',
      price: '$85,000-125,000',
      priceMin: 85000,
      priceMax: 125000,
      features: [
        'Everything in Package B, plus:',
        '5-10 animations per character',
        'Multiple camera angles',
        'Lighting variations',
        'Comprehensive training dataset',
      ],
      bestFor: 'Comprehensive SORA training with maximum variation',
      buttonVariant: 'secondary' as const,
      buttonText: 'Select Package C',
      variant: 'pink' as const,
    },
  ]

  return (
    <Section id="packages" className="bg-background-dark relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="gradient-orb gradient-orb-2" style={{ top: '20%', right: '-10%' }} />
      </div>

      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">CHOOSE YOUR PACKAGE</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8 mb-12"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.15
                }
              }
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.6 }}
              >
                <Card 
                  variant={pkg.variant || 'default'}
                  badge={pkg.recommended ? '⭐ RECOMMENDED' : undefined}
                  className="h-full flex flex-col"
                  tilt={pkg.recommended}
                >
                  <div className="text-center mb-6">
                    <motion.h3 
                      className="text-white mb-2"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + (index * 0.1) }}
                    >
                      {pkg.title}
                    </motion.h3>
                    <p className="text-brand-cyan text-lg font-semibold mb-4">
                      {pkg.subtitle}
                    </p>
                    <motion.p 
                      className="text-4xl font-black text-brand-lime"
                      initial={{ scale: 0.8, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 260,
                        damping: 20,
                        delay: 0.3 + (index * 0.1)
                      }}
                    >
                      {pkg.price}
                    </motion.p>
                    <p className="text-sm text-text-muted mt-1">50 Characters</p>
                  </div>

                  <div className="section-divider mb-6" />

                  <div className="flex-grow mb-6">
                    <h4 className="text-white font-bold mb-4 text-sm">What's Included:</h4>
                    <motion.ul 
                      className="space-y-3 text-text-muted"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: 0.08
                          }
                        }
                      }}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                      {pkg.features.map((feature, i) => (
                        <motion.li 
                          key={i} 
                          className="flex items-start text-sm"
                          variants={{
                            hidden: { opacity: 0, x: -20 },
                            visible: { opacity: 1, x: 0 }
                          }}
                        >
                          {feature.includes('plus:') ? (
                            <span className="font-semibold text-white">{feature}</span>
                          ) : (
                            <>
                              <span className="text-brand-lime mr-2">•</span>
                              <span>{feature}</span>
                            </>
                          )}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-text-muted mb-1">Best For:</p>
                    <p className="text-sm text-white">{pkg.bestFor}</p>
                  </div>

                  <Button 
                    variant={pkg.buttonVariant}
                    className="w-full"
                  >
                    {pkg.buttonText}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Footer note */}
          <motion.p 
            className="text-center text-text-muted text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
          >
            All packages include: <span className="text-white">Weekly reviews</span> • <span className="text-white">Priority support</span> • <span className="text-white">Unlimited revisions</span> (2 rounds per character) • <span className="text-white">Delivery within 12 weeks</span>
          </motion.p>
        </motion.div>
      </div>
    </Section>
  )
}
