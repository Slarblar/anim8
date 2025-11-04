'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

export function ScalingSection() {
  return (
    <Section id="scaling" className="bg-background-dark">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">BEYOND THE PILOT: YOUR FULL LIBRARY</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-8">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl text-center text-text max-w-3xl mx-auto mb-16">
            Once we validate the pipeline with 50 characters, we can scale efficiently to your full character library.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <Card>
              <h3 className="text-brand-lime mb-6 text-center">50 CHARACTER PILOT</h3>
              <div className="space-y-4 text-text">
                <div className="flex justify-between">
                  <span className="text-text-muted">Timeline:</span>
                  <span className="font-semibold">14-17 weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Team:</span>
                  <span className="font-semibold">8-12 people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Delivery:</span>
                  <span className="font-semibold">All at once</span>
                </div>
                <div className="section-divider my-4" />
                <div className="flex justify-between text-lg">
                  <span className="text-text-muted">Investment:</span>
                  <span className="font-bold text-brand-lime">$45k-100k</span>
                </div>
              </div>
            </Card>

            <Card variant="lime">
              <h3 className="text-brand-cyan mb-6 text-center">250 CHARACTER LIBRARY</h3>
              <div className="space-y-4 text-text">
                <div className="flex justify-between">
                  <span className="text-text-muted">Timeline:</span>
                  <span className="font-semibold">12-15 months</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Team:</span>
                  <span className="font-semibold">15-25 people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Delivery:</span>
                  <span className="font-semibold">Monthly batches</span>
                </div>
                <div className="section-divider my-4" />
                <div className="flex justify-between text-lg">
                  <span className="text-text-muted">Investment:</span>
                  <span className="font-bold text-brand-lime">$225k-500k</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="glass-card p-8 max-w-4xl mx-auto">
            <p className="text-brand-lime text-xl font-bold mb-6 text-center">
              Volume discount: 10-15% off per character after first 50
            </p>
            <h4 className="text-white font-bold mb-4">Why This Works:</h4>
            <ul className="space-y-3 text-text">
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>We retain core team knowledge from pilot</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Pipeline refinements reduce production time</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Batch production creates efficiency</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-3">✓</span>
                <span>Your feedback rhythm is established</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

