'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Header } from '@/components/ui/Header'
import { Footer } from '@/components/ui/Footer'
import { Section } from '@/components/ui/Section'
import { t, type Lang } from './translations'

// ── Shared sub-components ──────────────────────────────────────────────────────

function RoleTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs uppercase tracking-[0.2em] font-bold text-brand-lime bg-brand-lime/10 border border-brand-lime/30 px-3 py-1 rounded-sm mb-3">
      {children}
    </span>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.2em] text-brand-cyan font-bold mb-4 flex items-center gap-3">
      {children}
      <span className="flex-1 h-px bg-gradient-to-r from-brand-cyan/30 to-transparent" />
    </p>
  )
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-text-muted text-base leading-relaxed">
          <span className="text-brand-lime mt-1 flex-shrink-0 font-mono text-sm">→</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function SoftwareTag({ children, level }: { children: React.ReactNode; level: 'expert' | 'mid' | 'nice' }) {
  const styles = {
    expert: 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime',
    mid: 'bg-white/5 border-white/10 text-white/60',
    nice: 'bg-transparent border-white/10 text-white/40 border-dashed',
  }
  return (
    <span className={`text-[11px] font-mono px-3 py-1 rounded border ${styles[level]}`}>
      {children}
    </span>
  )
}

const cellBase = "p-5 md:p-8 bg-white/[0.03] backdrop-blur-sm"

function RoleCardGrid({
  overview,
  left,
  right,
}: {
  overview: React.ReactNode
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/8">
      <div className={`${cellBase} bg-gradient-to-r from-brand-lime/5 to-transparent border-b border-white/8`}>
        {overview}
      </div>
      <RoleCardRow left={left} right={right} />
    </div>
  )
}

function RoleCardRow({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="md:flex">
      <div className={`${cellBase} border-b md:border-b-0 md:border-r border-white/8 md:flex-1`}>
        {left}
      </div>
      <div className={`${cellBase} md:flex-1`}>
        {right}
      </div>
    </div>
  )
}

function LanguageToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
      {(['en', 'vn'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
            lang === l
              ? 'bg-brand-lime text-brand-black shadow-sm'
              : 'text-text-muted hover:text-white'
          }`}
        >
          {l === 'en' ? 'EN' : 'VN'}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CareersPage() {
  const [lang, setLang] = useState<Lang>('en')
  const c = t[lang]
  const headingFont = lang === 'vn' ? "'Be Vietnam Pro', sans-serif" : undefined

  const applyHref =
    'mailto:Tyler@anim-8.xyz?subject=Application%20%E2%80%94%20[Role]%20%7C%20Portfolio%20Submission&body=Hi%20Tyler%2C%0A%0AI%27d%20like%20to%20apply%20for%20the%20[Role]%20position%20at%20Anim-8.%0A%0APlease%20find%20my%20portfolio%20and%20CV%20attached.%0A%0ABest%2C%0A[Your%20Name]'

  return (
    <>
      <Header />

      <main className="bg-brand-navy min-h-screen">

        {/* ── HERO ── */}
        <section className="relative pt-36 sm:pt-44 md:pt-56 lg:pt-72 pb-16 md:pb-20 px-4 overflow-hidden border-b border-white/5">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-brand-lime/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand-cyan/5 blur-[100px] pointer-events-none" />

          <div className="container-custom text-center">
            <motion.p
              key={`hero-label-${lang}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] uppercase tracking-[0.3em] text-brand-lime font-bold mb-6 font-mono"
            >
              {c.heroLabel}
            </motion.p>

            <AnimatePresence mode="wait">
              <motion.h1
                key={`hero-h1-${lang}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-white mb-6"
                style={headingFont ? { fontFamily: headingFont } : undefined}
              >
                {c.heroHeadline[0]}<br />
                <span className="text-brand-lime">{c.heroHeadline[1]}</span>
              </motion.h1>
            </AnimatePresence>

            <div className="flex justify-center mb-10">
              <div className="lime-accent-line" />
            </div>

            <motion.div
              key={`hero-meta-${lang}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-x-8 gap-y-5 sm:gap-x-10 sm:gap-y-4 text-sm max-w-sm sm:max-w-none mx-auto"
            >
              {c.metaItems.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono">{label}</span>
                  <span className="text-white font-bold text-sm sm:text-base leading-snug">{value}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-text-muted font-mono">{c.metaInstagram}</span>
                <a
                  href="https://www.instagram.com/anim8.studios/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-cyan hover:text-brand-lime transition-colors font-bold text-sm sm:text-base"
                >
                  @anim8.studios ↗
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── ROLES NAV + LANGUAGE TOGGLE ── */}
        <nav className="sticky top-0 z-40 bg-brand-navy/90 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center px-4 md:px-8 lg:px-16">
            <div className="flex overflow-x-auto flex-1 hide-scrollbar">
              {c.rolesNav.map((role) => (
                <a
                  key={role.id}
                  href={`#${role.id}`}
                  className="flex-shrink-0 px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-text-muted hover:text-white border-b-2 border-transparent hover:border-brand-lime/50 transition-all duration-200 whitespace-nowrap"
                  style={headingFont ? { fontFamily: headingFont } : undefined}
                >
                  {role.label}
                </a>
              ))}
            </div>
            {/* Language Toggle */}
            <div className="flex-shrink-0 pl-4 py-2 border-l border-white/5 ml-2">
              <LanguageToggle lang={lang} setLang={setLang} />
            </div>
          </div>
        </nav>

        {/* ── ROLE 1: DESIGNER ── */}
        <Section id="designer" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`designer-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
                  <div>
                    <RoleTag>{c.designer.tag}</RoleTag>
                    <h2 className="text-white mb-2 text-3xl md:text-4xl lg:text-5xl" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.designer.title}</h2>
                    <p className="text-brand-cyan font-mono text-sm md:text-base">{c.designer.comp}</p>
                  </div>
                  <span className="self-start text-[10px] uppercase tracking-widest text-text-muted border border-white/10 px-3 py-2 rounded-sm font-mono whitespace-pre-line md:text-right">
                    {c.designer.badge}
                  </span>
                </div>

                <RoleCardGrid
                  overview={<><CardLabel>{c.designer.overview.label}</CardLabel><p className="text-text-muted leading-relaxed">{c.designer.overview.body}</p></>}
                  left={<><CardLabel>{c.designer.do.label}</CardLabel><BulletList items={c.designer.do.items} /></>}
                  right={<><CardLabel>{c.designer.looking.label}</CardLabel><BulletList items={c.designer.looking.items} /></>}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── ROLE 2: DESIGN INTERN ── */}
        <Section id="design-intern" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`intern-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
                  <div>
                    <RoleTag>{c.intern.tag}</RoleTag>
                    <h2 className="text-white mb-2 text-3xl md:text-4xl lg:text-5xl" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.intern.title}</h2>
                    <p className="text-brand-cyan font-mono text-sm md:text-base">{c.intern.comp}</p>
                  </div>
                  <span className="self-start text-[10px] uppercase tracking-widest text-text-muted border border-white/10 px-3 py-2 rounded-sm font-mono whitespace-pre-line md:text-right">
                    {c.intern.badge}
                  </span>
                </div>

                <RoleCardGrid
                  overview={<><CardLabel>{c.intern.about.label}</CardLabel><p className="text-text-muted leading-relaxed">{c.intern.about.body}</p></>}
                  left={<><CardLabel>{c.intern.do.label}</CardLabel><BulletList items={c.intern.do.items} /></>}
                  right={<><CardLabel>{c.intern.looking.label}</CardLabel><BulletList items={c.intern.looking.items} /></>}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── ROLE 3: 3D MODELER ── */}
        <Section id="3d-modeler" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`modeler-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
                  <div>
                    <RoleTag>{c.modeler.tag}</RoleTag>
                    <h2 className="text-white mb-2 text-3xl md:text-4xl lg:text-5xl" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.modeler.title}</h2>
                    <p className="text-brand-cyan font-mono text-sm md:text-base">{c.modeler.comp}</p>
                  </div>
                  <span className="self-start text-[10px] uppercase tracking-widest text-text-muted border border-white/10 px-3 py-2 rounded-sm font-mono whitespace-pre-line md:text-right">
                    {c.modeler.badge}
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/5">
                  {/* Overview - full width */}
                  <div className={`${cellBase} bg-gradient-to-r from-brand-lime/5 to-transparent border-b border-white/8`}>
                    <CardLabel>{c.modeler.overview.label}</CardLabel>
                    <p className="text-text-muted leading-relaxed">{c.modeler.overview.body}</p>
                  </div>
                  {/* Pairs row 1 */}
                  <RoleCardRow
                    left={<><CardLabel>{c.modeler.modeling.label}</CardLabel><BulletList items={c.modeler.modeling.items} /></>}
                    right={<><CardLabel>{c.modeler.materials.label}</CardLabel><BulletList items={c.modeler.materials.items} /></>}
                  />
                  {/* Pairs row 2 */}
                  <RoleCardRow
                    left={<><CardLabel>{c.modeler.pipeline.label}</CardLabel><BulletList items={c.modeler.pipeline.items} /></>}
                    right={<><CardLabel>{c.modeler.qualifications.label}</CardLabel><BulletList items={c.modeler.qualifications.items} /></>}
                  />
                  {/* Software row - starts the software card content inline */}
                  <div className={`${cellBase} border-t border-white/8`}>
                    <CardLabel>{c.modeler.software.label}</CardLabel>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono mb-2">{c.modeler.software.expertLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {['Substance Painter', 'Blender / Maya', 'ZBrush', 'Marvelous Designer'].map(s => (
                            <SoftwareTag key={s} level="expert">{s}</SoftwareTag>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono mb-2">{c.modeler.software.midLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {['Unreal Engine', 'Photoshop / 2D Tools'].map(s => (
                            <SoftwareTag key={s} level="mid">{s}</SoftwareTag>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono mb-2">{c.modeler.software.niceLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {['Substance Designer', 'Houdini', '3ds Max'].map(s => (
                            <SoftwareTag key={s} level="nice">{s}</SoftwareTag>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`${cellBase} border-t border-white/8`}>
                    <CardLabel>{c.modeler.portfolio.label}</CardLabel>
                    <BulletList items={c.modeler.portfolio.items} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── ROLE 4: STORYBOARD ── */}
        <Section id="storyboard" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`storyboard-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
                  <div>
                    <RoleTag>{c.storyboard.tag}</RoleTag>
                    <h2 className="text-white mb-2 text-3xl md:text-4xl lg:text-5xl" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.storyboard.title}</h2>
                    <p className="text-brand-cyan font-mono text-sm md:text-base">{c.storyboard.comp}</p>
                  </div>
                  <span className="self-start text-[10px] uppercase tracking-widest text-text-muted border border-white/10 px-3 py-2 rounded-sm font-mono whitespace-pre-line md:text-right">
                    {c.storyboard.badge}
                  </span>
                </div>

                <RoleCardGrid
                  overview={<><CardLabel>{c.storyboard.overview.label}</CardLabel><p className="text-text-muted leading-relaxed">{c.storyboard.overview.body}</p></>}
                  left={<><CardLabel>{c.storyboard.do.label}</CardLabel><BulletList items={c.storyboard.do.items} /></>}
                  right={<>
                    <CardLabel>{c.storyboard.looking.label}</CardLabel>
                    <BulletList items={c.storyboard.looking.items} />
                    <div className="mt-6 pl-4 border-l-2 border-brand-cyan/40 bg-brand-cyan/5 p-4 rounded-r-lg">
                      <p className="text-[10px] uppercase tracking-widest text-brand-cyan font-bold mb-3">{c.storyboard.bonus.label}</p>
                      <BulletList items={c.storyboard.bonus.items} />
                    </div>
                  </>}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── ROLE 5: VIDEO EDITOR / VFX ARTIST ── */}
        <Section id="video-editor" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`video-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8 md:mb-10">
                  <div>
                    <RoleTag>{c.video.tag}</RoleTag>
                    <h2 className="text-white mb-2 text-3xl md:text-4xl lg:text-5xl" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.video.title}</h2>
                    <p className="text-brand-cyan font-mono text-sm md:text-base">{c.video.comp}</p>
                  </div>
                  <span className="self-start text-[10px] uppercase tracking-widest text-text-muted border border-white/10 px-3 py-2 rounded-sm font-mono whitespace-pre-line md:text-right">
                    {c.video.badge}
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-white/8">
                  {/* Overview */}
                  <div className={`${cellBase} bg-gradient-to-r from-brand-lime/5 to-transparent border-b border-white/8`}>
                    <CardLabel>{c.video.overview.label}</CardLabel>
                    <p className="text-text-muted leading-relaxed">{c.video.overview.body}</p>
                  </div>

                  {/* Position 1 | Position 2 */}
                  <RoleCardRow
                    left={<>
                      <span className="inline-block text-xs uppercase tracking-[0.2em] font-bold text-brand-lime bg-brand-lime/10 border border-brand-lime/30 px-3 py-1 rounded-sm mb-4">
                        {c.video.editor.label}
                      </span>
                      <CardLabel>{c.video.editor.responsibilities.label}</CardLabel>
                      <BulletList items={c.video.editor.responsibilities.items} />
                      <div className="mt-6">
                        <CardLabel>{c.video.editor.requirements.label}</CardLabel>
                        <BulletList items={c.video.editor.requirements.items} />
                      </div>
                    </>}
                    right={<>
                      <span className="inline-block text-xs uppercase tracking-[0.2em] font-bold text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 px-3 py-1 rounded-sm mb-4">
                        {c.video.vfx.label}
                      </span>
                      <CardLabel>{c.video.vfx.responsibilities.label}</CardLabel>
                      <BulletList items={c.video.vfx.responsibilities.items} />
                      <div className="mt-6">
                        <CardLabel>{c.video.vfx.requirements.label}</CardLabel>
                        <BulletList items={c.video.vfx.requirements.items} />
                      </div>
                    </>}
                  />

                  {/* General Requirements */}
                  <div className={`${cellBase} border-t border-white/8`}>
                    <CardLabel>{c.video.general.label}</CardLabel>
                    <BulletList items={c.video.general.items} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── ABOUT ── */}
        <Section id="about" className="bg-brand-navy border-b border-white/5">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={`about-${lang}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-center mb-4 text-white" style={headingFont ? { fontFamily: headingFont } : undefined}>{c.about.sectionTitle}</h2>
                <div className="flex justify-center mb-16">
                  <div className="lime-accent-line" />
                </div>

                <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
                  {/* Studio Info */}
                  <div className="glass-card p-5 md:p-8">
                    <CardLabel>{c.about.studioInfo.label}</CardLabel>
                    <ul className="space-y-4 mb-6">
                      {[
                        { icon: '📍', text: c.about.studioInfo.items[0] },
                        { icon: '🕐', text: c.about.studioInfo.items[1] },
                        { icon: '🌐', text: c.about.studioInfo.items[2] },
                      ].map(({ icon, text }) => (
                        <li key={icon} className="flex items-start gap-3 text-text-muted text-sm">
                          <span className="text-base flex-shrink-0">{icon}</span>
                          <span>{text}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-3 text-sm">
                        <span className="text-base flex-shrink-0">📸</span>
                        <a
                          href="https://www.instagram.com/anim8.studios/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-cyan hover:text-brand-lime transition-colors"
                        >
                          {c.about.studioInfo.instagramLabel}
                        </a>
                      </li>
                    </ul>
                    <p className="text-text-muted text-sm leading-relaxed">{c.about.studioInfo.description}</p>
                  </div>

                  {/* Creative Leadership */}
                  <div className="glass-card p-5 md:p-8">
                    <CardLabel>{c.about.leadership.label}</CardLabel>
                    <div className="space-y-6">
                      {[
                        {
                          initials: 'JN',
                          name: 'Jordan Nguyen',
                          role: lang === 'vn' ? 'Đồng Sáng Lập' : 'Co-founder',
                          studio: 'Spacestation Animation · Quarter Machine',
                          links: [{ label: 'Portfolio ↗', href: 'https://www.jordannguyen.me' }],
                        },
                        {
                          initials: 'CL',
                          name: 'Chris Le',
                          role: lang === 'vn' ? 'Đồng Sáng Lập' : 'Co-founder',
                          studio: 'RTFKT · Nike Web3',
                          links: [
                            { label: 'Instagram ↗', href: 'https://www.instagram.com/clegfx/' },
                            { label: 'IMDb ↗', href: 'https://www.imdb.com/name/nm2211997/' },
                          ],
                        },
                      ].map((person) => (
                        <div key={person.name} className="flex items-start gap-4 pb-5 border-b border-white/5 last:border-0 last:pb-0">
                          <div className="w-10 h-10 rounded-full bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center flex-shrink-0 text-brand-lime text-sm font-bold">
                            {person.initials}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-white font-bold text-sm">{person.name}</p>
                            <p className="text-text-muted text-xs">{person.role}</p>
                            <p className="text-brand-cyan text-xs font-mono">{person.studio}</p>
                            <div className="flex gap-2 pt-1">
                              {person.links.map((link) => (
                                <a
                                  key={link.label}
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-brand-cyan hover:text-brand-lime border border-brand-cyan/20 hover:border-brand-lime/30 bg-brand-cyan/5 px-2 py-0.5 rounded transition-all"
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Production Team */}
                <div className="glass-card p-5 md:p-8 mb-8">
                  <CardLabel>{c.about.team.label}</CardLabel>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: 'Darren Flowers', role: lang === 'vn' ? 'Giám Đốc Kỹ Thuật' : 'Technical Director', studio: 'Eden Offline · Sakira Mods TikTok' },
                      { name: 'Khai Pham', role: lang === 'vn' ? 'Trưởng Nhóm Dựng Hình' : 'Lead Modeler', studio: 'Sparx · Activision · Riot · Disney' },
                      { name: 'Luka', role: lang === 'vn' ? 'Giám Đốc Hoạt Hình' : 'Animation Supervisor', studio: 'AAA Game Development' },
                      { name: 'Keira Duong', role: lang === 'vn' ? 'Giám Đốc Điều Hành' : 'Chief Operating Officer', studio: 'Big 4 Advisory · Finance & Growth' },
                    ].map((member) => (
                      <div key={member.name} className="bg-white/3 border border-white/5 rounded-xl p-4">
                        <p className="text-white font-bold text-sm mb-1">{member.name}</p>
                        <p className="text-brand-lime text-[11px] uppercase tracking-wider font-bold mb-1">{member.role}</p>
                        <p className="text-text-muted text-[11px] font-mono leading-snug">{member.studio}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="glass-card p-5 md:p-8">
                  <CardLabel>{c.about.benefits.label}</CardLabel>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {c.about.benefits.items.map((benefit) => (
                      <div
                        key={benefit.title}
                        className={`p-5 rounded-xl border transition-all duration-200 hover:border-brand-lime/30 ${
                          benefit.highlight
                            ? 'bg-brand-lime/8 border-brand-lime/20'
                            : 'bg-white/3 border-white/5'
                        }`}
                      >
                        <p className="text-white font-bold text-sm mb-1">{benefit.title}</p>
                        <p className="text-text-muted text-xs leading-relaxed">{benefit.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

        {/* ── CTA ── */}
        <Section id="cta" className="bg-brand-navy">
          <div className="container-custom text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`cta-${lang}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-brand-lime font-bold mb-6 font-mono">
                  {c.cta.label}
                </p>
                <h2 className="text-white mb-6" style={headingFont ? { fontFamily: headingFont } : undefined}>
                  {c.cta.headline[0]}<br />
                  <span className="text-brand-lime">{c.cta.headline[1]}</span>
                </h2>
                <div className="flex justify-center mb-8">
                  <div className="lime-accent-line" />
                </div>
                <p className="text-text-muted max-w-md mx-auto mb-10 text-base">{c.cta.sub}</p>
                <a href={applyHref} className="glass-button-primary inline-flex items-center gap-3">
                  {c.cta.button}
                  <span className="text-lg">↗</span>
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>

      </main>

      <Footer />
    </>
  )
}
