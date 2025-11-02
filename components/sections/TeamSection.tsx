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
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          {/* Production Leadership */}
          <div className="mb-16">
            <h3 className="text-brand-lime text-2xl mb-8 text-center">
              Production Leadership:
            </h3>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { 
                  name: 'Darren Flowers', 
                  role: 'Technical Director',
                  details: [
                    'Pipeline architecture and optimization',
                    'Quality control and technical standards',
                  ]
                },
                { 
                  name: 'Khai Pham', 
                  role: 'Lead Modeler',
                  details: [
                    'Character modeling and art direction',
                    'Team mentorship and style consistency',
                  ]
                },
                { 
                  name: 'Luka Tran', 
                  role: 'Senior Animator',
                  details: [
                    'Character animation and motion systems',
                    'Rigging and deformation specialist',
                  ]
                },
              ].map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="text-center h-full">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-lime/30 to-brand-cyan/30 border-2 border-brand-lime mx-auto mb-4 flex items-center justify-center text-3xl">
                      👤
                    </div>
                    <h4 className="text-white font-bold mb-1">{member.name}</h4>
                    <p className="text-brand-cyan text-sm mb-4">{member.role}</p>
                    <ul className="text-left space-y-2">
                      {member.details.map((detail, j) => (
                        <li key={j} className="text-text-muted text-xs flex items-start">
                          <span className="text-brand-lime mr-2">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Production Capacity */}
          <div className="mb-12">
            <h3 className="text-brand-cyan text-2xl mb-8 text-center">
              Production Capacity:
            </h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Card>
                <h4 className="text-brand-lime font-bold mb-4">Core Team: 8 specialists</h4>
                <ul className="space-y-2 text-text-muted text-sm">
                  <li className="flex items-start">
                    <span className="text-brand-lime mr-2">•</span>
                    <span>Full-time dedicated to active projects</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-lime mr-2">•</span>
                    <span>US-based project management</span>
                  </li>
                </ul>
              </Card>
              <Card>
                <h4 className="text-brand-cyan font-bold mb-4">On-Demand Capacity: 10-20 modelers</h4>
                <ul className="space-y-2 text-text-muted text-sm">
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Senior and mid-level artists</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Scalable based on project needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Proven at RTFKT-scale production</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>

        </motion.div>
      </div>
    </Section>
  )
}

