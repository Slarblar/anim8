'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

export function TeamSection() {
  return (
    <Section id="team" className="bg-background-dark">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">WHO'S BUILDING THIS</h2>
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          {/* Core Team */}
          <div className="mb-16">
            <h3 className="text-brand-lime text-2xl mb-8 text-center">
              Core Production Team (US-Based Management)
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: 'Jordan Nguyen', role: 'Project Manager' },
                { name: 'Khai Pham', role: 'Lead Modeler' },
                { name: 'Darren Flowers', role: 'Senior Rigger' },
                { name: 'Luka Tran', role: 'Senior Animator' },
              ].map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-lime/30 to-brand-cyan/30 border-2 border-brand-lime mx-auto mb-4 flex items-center justify-center text-3xl">
                      👤
                    </div>
                    <h4 className="text-white font-bold mb-1">{member.name}</h4>
                    <p className="text-brand-cyan text-sm">{member.role}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Vietnam Team */}
          <div className="mb-12">
            <h3 className="text-brand-cyan text-2xl mb-8 text-center">
              Vietnam Production Team (Cost-Effective Execution)
            </h3>
            <div className="glass-card p-8 max-w-3xl mx-auto">
              <ul className="space-y-3 text-text">
                <li>• 2-3 Senior Modelers (current capacity)</li>
                <li>• 4-6 Mid/Junior Modelers (scaled as needed)</li>
                <li>• Additional 10-30 modelers available on-demand</li>
              </ul>
            </div>
          </div>

          {/* Why Vietnam */}
          <div className="mb-12">
            <h3 className="text-brand-pink text-2xl mb-8 text-center">Why Vietnam?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🌏', text: '12-hour timezone overlap (feedback while you sleep)' },
                { icon: '💰', text: 'World-class 3D talent at 40-60% US cost' },
                { icon: '🏆', text: 'Proven track record with international studios' },
                { icon: '💬', text: 'English-speaking project management' },
              ].map((item, i) => (
                <Card key={i} hover={false} className="text-center">
                  <div className="text-4xl mb-3">{item.icon}</div>
                  <p className="text-sm text-text-muted">{item.text}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div className="glass-card p-8 max-w-4xl mx-auto">
            <h3 className="text-white font-bold mb-6 text-center">Our Infrastructure:</h3>
            <ul className="space-y-3 text-text">
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Real-time project tracking (Asana.com)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Daily async standups via Discord</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Weekly video reviews (recorded & shared)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Cloud-based file management (instant access via Google Drive)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>SyncSketch for visual feedback (annotate directly on models)</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

