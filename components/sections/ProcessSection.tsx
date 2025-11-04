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
        'Weekly batches: 5-7 characters delivered',
        'Friday review sessions (video call or async)',
        'Feedback implemented within 48 hours',
        'Continuous QC by lead team',
        "You're always 1 week ahead in review pipeline",
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

          {/* Communication Rhythm - Redesigned */}
          <motion.div 
            className="max-w-6xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3 className="text-white font-bold text-3xl mb-4 text-center">Communication Rhythm</h3>
            <p className="text-text text-center mb-12 max-w-2xl mx-auto">
              Stay in sync with transparent, consistent updates throughout production
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-full">
              {[
                {
                  frequency: 'Daily',
                  description: 'Email updates from team',
                  color: 'lime',
                  icon: '📧',
                  gradient: 'from-brand-lime/20 to-brand-lime/5'
                },
                {
                  frequency: 'Weekly',
                  description: 'Video progress review',
                  color: 'cyan',
                  icon: '🎥',
                  gradient: 'from-brand-cyan/20 to-brand-cyan/5'
                },
                {
                  frequency: 'Bi-weekly',
                  description: '1-on-1 with project lead (15-30 min)',
                  color: 'cyan',
                  icon: '💬',
                  gradient: 'from-brand-cyan/20 to-brand-cyan/5'
                },
                {
                  frequency: 'Anytime',
                  description: 'Rapid response to questions/blockers',
                  color: 'pink',
                  icon: '⚡',
                  gradient: 'from-brand-pink/20 to-brand-pink/5'
                }
              ].map((comm, index) => (
                <motion.div
                  key={comm.frequency}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="relative"
                  style={{ touchAction: 'manipulation' }}
                >
                  <div className={`glass-card p-6 text-center h-full flex flex-col items-center border-2 max-w-full ${
                    comm.color === 'lime' ? 'border-brand-lime/30 hover:border-brand-lime/50' :
                    comm.color === 'cyan' ? 'border-brand-cyan/30 hover:border-brand-cyan/50' :
                    'border-brand-pink/30 hover:border-brand-pink/50'
                  } transition-all duration-300`}>
                    {/* Circular Badge */}
                    <motion.div 
                      className={`w-20 h-20 rounded-full bg-gradient-to-br ${comm.gradient} border-2 ${
                        comm.color === 'lime' ? 'border-brand-lime' :
                        comm.color === 'cyan' ? 'border-brand-cyan' :
                        'border-brand-pink'
                      } flex items-center justify-center mb-4 shadow-lg`}
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <span className="text-3xl">{comm.icon}</span>
                    </motion.div>

                    {/* Frequency Label */}
                    <h4 className={`font-black text-xl mb-3 ${
                      comm.color === 'lime' ? 'text-brand-lime' :
                      comm.color === 'cyan' ? 'text-brand-cyan' :
                      'text-brand-pink'
                    }`}>
                      {comm.frequency}
                    </h4>

                    {/* Description */}
                    <p className="text-text-muted text-sm leading-relaxed break-words">
                      {comm.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  )
}

