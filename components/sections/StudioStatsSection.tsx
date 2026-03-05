'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const stats = [
  {
    value: 48,
    suffix: 'hrs',
    label: 'Character Turnaround',
    description: 'Concept to production-ready',
    color: 'text-brand-lime',
  },
  {
    value: 10,
    suffix: '+',
    label: 'Core Team Members',
    description: '8 dedicated 3D specialists',
    color: 'text-brand-cyan',
  },
  {
    value: 15,
    suffix: '+',
    label: 'On-Demand Modelers',
    description: 'Scalable surge capacity',
    color: 'text-brand-pink',
  },
  {
    value: 100,
    suffix: '%',
    label: 'In-House Production',
    description: 'One team, one point of contact',
    color: 'text-brand-lime',
  },
]

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="text-center px-4"
    >
      <div
        className={`font-black mb-2 ${stat.color}`}
        style={{
          fontFamily: 'futura-pt-heavy, futura-pt, sans-serif',
          fontSize: 'clamp(3rem, 7vw, 5rem)',
          lineHeight: 1,
        }}
      >
        {isInView ? (
          <CountUp
            start={0}
            end={stat.value}
            duration={1.8}
            suffix={stat.suffix}
            useEasing
          />
        ) : (
          <span>0{stat.suffix}</span>
        )}
      </div>
      <p className="text-white font-bold text-lg mb-1">{stat.label}</p>
      <p className="text-text-muted text-sm">{stat.description}</p>
    </motion.div>
  )
}

export function StudioStatsSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Gradient band background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(124, 193, 66, 0.06) 0%, rgba(56, 194, 214, 0.04) 50%, rgba(221, 11, 131, 0.04) 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="container-custom relative z-10">
        {/* Eyebrow */}
        <motion.p
          className="text-center text-brand-lime font-semibold tracking-[0.2em] text-xs uppercase mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          By the numbers
        </motion.p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} />
          ))}
        </div>

        {/* Credential banner */}
        <motion.div
          className="mt-16 flex flex-wrap justify-center items-center gap-4 md:gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {[
            'RTFKT Co-founder',
            'CloneX 20K+ Avatars',
            'Spacestation Animation',
            'Sparx · Activision · Ubisoft',
            'Riot · Disney · Marvel',
          ].map((cred) => (
            <span
              key={cred}
              className="text-text-muted text-sm px-4 py-2 glass-card rounded-full whitespace-nowrap"
            >
              {cred}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
