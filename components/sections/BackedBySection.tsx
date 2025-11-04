'use client'

import { motion } from 'framer-motion'
import { Section } from '../ui/Section'
import Image from 'next/image'
import Link from 'next/link'

export function BackedBySection() {
  const founders = [
    {
      name: 'CHRIS LE',
      title: 'Co-founder',
      role: 'RTFKT',
      image: '/images/founders/chrisle.webp',
      body: [
        "Co-founded RTFKT, pioneering NFT character systems at scale",
        "Led production of CloneX (20,000+ unique 3D avatars)",
        "Built Nike's Web3 infrastructure post-acquisition",
        "Scaled digital collectible production from concept to billions in value",
      ],
      keyExperience: [
        'Developed NFT IP Systems from concept to digital and physical product',
        'Community-driven character production',
        'Web3-native pipelines and workflows',
      ],
    },
    {
      name: 'JORDAN NGUYEN',
      title: 'Co-founder',
      role: 'Spacestation Animation, Quarter Machine',
      image: '/images/founders/jordannguyen.webp',
      link: 'https://www.jordannguyen.me/',
      body: [
        'Co-founded Spacestation Animation, pioneering creator economy content multi media pipelines',
        'Character production leadership across animation and gaming',
        'Specialized in rapid character production pipelines',
        'Project management and team scaling expertise',
      ],
      keyExperience: [
        'Character production for entertainment and gaming',
        'Team building and pipeline development',
        'Rapid iteration and delivery systems',
      ],
    },
  ]

  return (
    <Section id="backed-by" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">STUDIO BACKED BY</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {founders.map((founder, index) => {
              const CardContent = (
                <>
                  {/* Headshot with lime border */}
                  <div className="relative w-32 h-32 mx-auto mb-6 rounded-full border-[3px] border-brand-lime overflow-hidden bg-background-dark/50 group-hover:shadow-[0_0_30px_rgba(124,193,66,0.5)] transition-shadow duration-300">
                    <Image
                      src={founder.image}
                      alt={founder.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>

                  <h3 className="text-white text-center mb-2 font-black">
                    {founder.name}
                  </h3>
                  <p className="text-brand-lime text-center mb-1 font-semibold text-sm">
                    {founder.title}
                  </p>
                  <p className="text-brand-cyan text-center mb-6 font-medium text-sm">
                    {founder.role}
                  </p>

                  <div className="space-y-4 mb-6">
                    {founder.body.map((item, i) => (
                      <p key={i} className="text-text-muted text-sm leading-relaxed">
                        • {item}
                      </p>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white font-bold mb-3 text-sm">Key Experience:</p>
                    <div className="space-y-2">
                      {founder.keyExperience.map((exp, i) => (
                        <p key={i} className="text-text-muted text-sm">
                          • {exp}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )

              return (
                <motion.div
                  key={founder.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  drag={false}
                  style={{ touchAction: 'pan-y' }}
                >
                  {founder.link ? (
                    <Link 
                      href={founder.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block glass-card p-8 group hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                      style={{ touchAction: 'manipulation' }}
                    >
                      {CardContent}
                    </Link>
                  ) : (
                    <div className="glass-card p-8 group hover:scale-[1.02] transition-all duration-300" style={{ touchAction: 'pan-y' }}>
                      {CardContent}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </Section>
  )
}

