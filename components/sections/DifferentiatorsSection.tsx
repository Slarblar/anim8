'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

export function DifferentiatorsSection() {
  const differentiators = [
    {
      title: 'NO VENDOR CHAOS',
      description: 'One team handles modeling, rigging, animation, and render with one point of contact.',
      icon: '🎯',
    },
    {
      title: 'BUILT TO SCALE',
      description: 'Start with 8 people, scale to 25+ in weeks. You control the speed dial.',
      icon: '📈',
    },
    {
      title: 'RAPID ITERATION',
      description: 'Feedback Friday, updated Monday. No 2-week wait times. Real-time communication.',
      icon: '⚡',
    },
    {
      title: 'IP-FOCUSED',
      description: "We understand you're building a content empire, not just models. Our goal is to be long-term partners, not transactional vendors.",
      icon: '🤝',
    },
  ]

  return (
    <Section id="differentiators" className="bg-background-dark">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">WHY STUDIOS CHOOSE US</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentiators.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full text-center">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-brand-lime text-lg mb-3">{item.title}</h3>
                  <p className="text-text-muted text-sm">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

