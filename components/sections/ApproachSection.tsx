'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'
import { MdAccountTree, MdRocket, MdBolt } from 'react-icons/md'

export function ApproachSection() {
  const approaches = [
    {
      title: 'FULL PIPELINE',
      description: 'Modeling → Rigging → Animation → Render',
      detail: 'Everything in-house with no vendor juggling and one point of contact.',
      icon: MdAccountTree,
      color: 'text-brand-lime',
    },
    {
      title: 'RAPID SCALE',
      description: '10 core team members (8 3D specialists) with 10-15+ modelers on-demand',
      detail: 'We scale with your budget and timeline.',
      icon: MdRocket,
      color: 'text-brand-cyan',
    },
    {
      title: 'PROVEN SPEED',
      description: 'Production-ready character in 48hrs',
      detail: 'Weekly deliveries with real-time feedback and less waiting.',
      icon: MdBolt,
      color: 'text-brand-pink',
    },
  ]

  return (
    <Section id="approach" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">WHY WE{`'`}RE DIFFERENT</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.2
                }
              }
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {approaches.map((approach, index) => {
              const Icon = approach.icon
              return (
                <motion.div
                  key={approach.title}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.9 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ duration: 0.6 }}
                >
                  <Card hover className="h-full">
                    <motion.div 
                      className={`text-6xl mb-6 text-center ${approach.color}`}
                      whileHover={{ 
                        scale: 1.3,
                        rotate: 360,
                      }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 260,
                        damping: 20
                      }}
                    >
                      <div className="inline-block">
                        <Icon />
                      </div>
                    </motion.div>
                    <h3 className={`${approach.color} mb-4 text-center font-extrabold`}>
                      {approach.title}
                    </h3>
                    <p className="text-xl font-semibold text-white mb-4 text-center">
                      {approach.description}
                    </p>
                    <p className="text-text-muted text-center">
                      {approach.detail}
                    </p>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.div>
      </div>
    </Section>
  )
}
