'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

export function ProcessSection() {
  const phases = [
    {
      phase: 'PHASE 1',
      title: 'PRE-PRODUCTION (Week 1-2)',
      items: [
        'Kickoff call: Align on vision & priorities',
        'Style guide development',
        '3 hero models for approval',
        'Pipeline & quality standards locked',
        'Production schedule finalized',
      ],
      milestone: 'Hero models approved → Deposit payment',
    },
    {
      phase: 'PHASE 2',
      title: 'PRODUCTION (Week 3-8)',
      items: [
        'Weekly batches: 8-10 characters delivered',
        'Friday review sessions (video call or async)',
        'Feedback implemented within 48 hours',
        'Continuous QC by lead team',
        'You\'re always 1 week ahead in review pipeline',
      ],
      milestone: '25 characters approved → Progress payment',
    },
    {
      phase: 'PHASE 3',
      title: 'POLISH & DELIVERY (Week 9-12)',
      items: [
        'Final character batches',
        'Revision rounds completed',
        'Comprehensive QC pass',
        'File organization & documentation',
        'Training handoff (if applicable)',
      ],
      milestone: 'All 50 delivered → Final payment',
    },
  ]

  return (
    <Section id="process" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">HOW WE WORK TOGETHER</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          <div className="space-y-8 mb-16">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <Card>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-full bg-brand-lime/20 border-2 border-brand-lime flex items-center justify-center">
                        <span className="text-2xl font-black text-brand-lime">{i + 1}</span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-white mb-4">{phase.title}</h3>
                      <ul className="space-y-2 mb-4">
                        {phase.items.map((item, j) => (
                          <li key={j} className="flex items-start text-text-muted">
                            <span className="text-brand-lime mr-2">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="bg-brand-lime/10 border-l-4 border-brand-lime p-4 rounded">
                        <p className="text-sm font-bold text-brand-lime">
                          Milestone: <span className="text-white font-normal">{phase.milestone}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Communication */}
          <div className="glass-card p-8 max-w-4xl mx-auto">
            <h3 className="text-white font-bold mb-6 text-center">Communication Rhythm:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-brand-lime font-bold mb-2">Daily:</p>
                <p className="text-text-muted">Email updates from team</p>
              </div>
              <div>
                <p className="text-brand-lime font-bold mb-2">Weekly:</p>
                <p className="text-text-muted">Video progress review</p>
              </div>
              <div>
                <p className="text-brand-cyan font-bold mb-2">Bi-weekly:</p>
                <p className="text-text-muted">1-on-1 with project lead (15-30 min)</p>
              </div>
              <div>
                <p className="text-brand-pink font-bold mb-2">Anytime:</p>
                <p className="text-text-muted">Rapid response to questions/blockers</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

