'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import { AnimatedBackground } from '../ui/AnimatedBackground'
import { MdSpeed, MdStars, MdTrendingUp } from 'react-icons/md'

export function VisionSection() {
  const features = [
    {
      title: 'Speed',
      description: 'Veefriends moves fast, and so do we',
      icon: MdSpeed,
      color: 'text-brand-lime',
    },
    {
      title: 'Quality',
      description: 'Your brand demands excellence',
      icon: MdStars,
      color: 'text-brand-cyan',
    },
    {
      title: 'Scale',
      description: '50 characters now, 250+ at scale',
      icon: MdTrendingUp,
      color: 'text-brand-pink',
    },
  ]

  return (
    <Section id="vision" className="bg-background-dark relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <AnimatedBackground />

      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-center mb-4 text-white gradient-text-simple">
            THE VISION
          </h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-12">
            <div className="lime-accent-line" />
          </div>
          
          <div className="space-y-6 text-lg md:text-xl text-text relative z-10">
            <motion.p 
              className="font-semibold text-2xl text-brand-lime"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              VeeFriends needs more than 3D models. They need scalable IP infrastructure—characters ready for video generation training, community content, and endless creative variations.
            </motion.p>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              This is more than a character library. This is building <span className="text-brand-cyan font-semibold">content infrastructure</span> that generates endless variations of VeeFriends IP for UGC and community building, similar to Pudgy Penguins but with stronger production systems.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              That requires a production partner who understands:
            </motion.p>

            <motion.div 
              className="grid md:grid-cols-3 gap-6 mt-8"
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
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <motion.div
                    key={feature.title}
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    transition={{ duration: 0.6 }}
                    className="glass-card p-6 text-center group cursor-pointer hover:scale-105 transition-transform duration-300"
                    drag={false}
                    style={{ touchAction: 'pan-y' }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div 
                      className={`text-6xl mb-4 mx-auto w-fit ${feature.color}`}
                      whileHover={{ 
                        scale: 1.2,
                        rotate: 15,
                      }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <Icon />
                    </motion.div>
                    <h3 className={`${feature.color} mb-3`}>{feature.title}</h3>
                    <p className="text-text-muted text-base">
                      {feature.description}
                    </p>
                  </motion.div>
                )
              })}
            </motion.div>

            <motion.p 
              className="text-center text-xl font-bold text-white mt-12"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              We{`'`}ve built our team specifically for something like this.
            </motion.p>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}
