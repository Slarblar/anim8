'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'

const services = [
  {
    number: '01',
    title: '3D CHARACTER PRODUCTION',
    description:
      'Full-pipeline character modeling from concept through final delivery. Clean quad topology, professional PBR texturing (2K–4K), and organized file exports in FBX, OBJ, and USD formats.',
    tags: ['Blender', 'ZBrush', 'Maya', 'Substance Painter'],
    accent: 'text-brand-lime',
    border: 'border-brand-lime/20',
    image: '/images/modeling-pipeline/high-polysculpt.webp',
    deliverable: '3–4 days per character',
  },
  {
    number: '02',
    title: 'RIGGING & ANIMATION',
    description:
      'Maya/Unreal compatible rigs with full FK/IK controls, facial blend shapes, and weight painting. Animation packages include idle, walk, run cycles, and character actions.',
    tags: ['Maya', 'Unreal Engine', 'FK/IK Controls', 'Facial Blend Shapes'],
    accent: 'text-brand-cyan',
    border: 'border-brand-cyan/20',
    image: '/images/optional-expansions/addrigging.webp',
    deliverable: '+2–3 days per character',
  },
  {
    number: '03',
    title: 'RENDERS & VISUAL DEVELOPMENT',
    description:
      '4K beauty renders, turntable videos, lighting variations, and promotional asset packages. High-impact visuals ready for marketing, pitches, trailers, and product launches.',
    tags: ['4K Beauty Renders', 'Turntable Video', 'Lighting Variants', 'Promo Assets'],
    accent: 'text-brand-pink',
    border: 'border-brand-pink/20',
    image: '/images/optional-expansions/rendering.webp',
    deliverable: '+1–2 days per character',
  },
  {
    number: '04',
    title: 'PIPELINE & IP DEVELOPMENT',
    description:
      'End-to-end production pipeline architecture for studios and IP holders scaling a character library. Style guide development, QC systems, team training, and full technical documentation.',
    tags: ['Style Guide', 'QC Systems', 'IP Scaling', 'Documentation'],
    accent: 'text-brand-lime',
    border: 'border-brand-lime/20',
    image: '/images/optional-expansions/animation.webp',
    deliverable: 'Custom scope',
  },
]

export function StudioServicesSection() {
  return (
    <Section id="services" className="bg-brand-navy relative overflow-hidden">
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">WHAT WE BUILD</h2>

          <div className="flex justify-center mb-6">
            <div className="lime-accent-line" />
          </div>

          <p className="text-xl text-center text-text-muted max-w-2xl mx-auto mb-16">
            Four core services. One in-house team. Zero vendor juggling.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.12 }}
                drag={false}
                style={{ touchAction: 'pan-y' }}
              >
                <Card hover className={`h-full border ${service.border}`}>
                  {/* Service image */}
                  <div className="relative w-full h-40 rounded-xl overflow-hidden mb-6 bg-brand-navy/50">
                    <Image
                      src={service.image}
                      alt={service.title}
                      fill
                      className="object-cover opacity-70"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Number badge */}
                    <span
                      className={`absolute top-3 left-4 font-black text-5xl opacity-30 ${service.accent}`}
                      style={{ fontFamily: 'futura-pt-heavy, futura-pt, sans-serif' }}
                    >
                      {service.number}
                    </span>
                    {/* Deliverable chip */}
                    <span className="absolute bottom-3 right-3 glass-card px-3 py-1 text-xs font-semibold text-white/80 rounded-full">
                      {service.deliverable}
                    </span>
                  </div>

                  <h3 className={`${service.accent} mb-3 text-lg font-extrabold`}>
                    {service.title}
                  </h3>
                  <p className="text-text-muted text-sm leading-relaxed mb-5">
                    {service.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  )
}
