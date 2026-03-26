'use client'

import { useEffect, useState, useCallback } from 'react'
import './page.css'
import { GlobeWork } from '@/components/ui/GlobeWork'

const clientLinks: Record<string, string> = {
  'VeeFriends':        'https://veefriends.com/',
  'RTFKT':             'https://rtfkt.com/',
  'Sao House':         'https://www.saohouse.com/',
  'SLCSCOOP':          'https://www.instagram.com/slcscoop/',
  'Insomniac x RNBW': 'https://www.insomniac.com/',
  'Sakira Mods':       'https://www.tiktok.com/@sakiramods',
}

const clientNames = [
  'Sao House', 'VeeFriends', 'RTFKT', 'SLCSCOOP',
  'Insomniac x RNBW', 'Sakira Mods',
]

function landingUsesCustomCursor() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (window.matchMedia('(hover: none)').matches) return false
  return true
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Activate landing body class
  useEffect(() => {
    document.body.classList.add('landing-active')
    return () => {
      document.body.classList.remove('landing-active')
      document.body.style.overflow = ''
    }
  }, [])

  // Custom cursor (mouse / fine pointer only — skip touch-first devices)
  useEffect(() => {
    if (!landingUsesCustomCursor()) return
    const dot = document.getElementById('cursor-dot')
    const ring = document.getElementById('cursor-ring')
    if (!dot || !ring) return
    let mx = 0, my = 0, rx = 0, ry = 0
    let animId: number

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`
    }
    const loop = () => {
      rx += (mx - rx) * 0.11
      ry += (my - ry) * 0.11
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`
      animId = requestAnimationFrame(loop)
    }
    document.addEventListener('mousemove', onMouseMove)
    animId = requestAnimationFrame(loop)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  // Cursor ring hover expansion (same devices as custom cursor)
  useEffect(() => {
    if (!landingUsesCustomCursor()) return
    const addHov = () => document.body.classList.add('hov')
    const remHov = () => document.body.classList.remove('hov')
    const els = document.querySelectorAll('a,button,.wc,.svc,.mnav,.step,.stat')
    els.forEach(el => {
      el.addEventListener('mouseenter', addHov)
      el.addEventListener('mouseleave', remHov)
    })
    return () => {
      els.forEach(el => {
        el.removeEventListener('mouseenter', addHov)
        el.removeEventListener('mouseleave', remHov)
      })
    }
  }, [])

  // Nav scroll frosted glass
  useEffect(() => {
    const onScroll = () => {
      const nav = document.getElementById('lp-nav')
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll reveal
  useEffect(() => {
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          ro.unobserve(e.target)
        }
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.lp .reveal').forEach(el => ro.observe(el))
    return () => ro.disconnect()
  }, [])

  return (
    <div className="lp">
      <div id="cursor-dot" />
      <div id="cursor-ring" />

      {/* ══ NAV ══════════════════════════════════════════════ */}
      <nav id="lp-nav">
        <a className="nav-logo" href="#" onClick={closeMenu}>
          <img
            src="/images/logos/anim-8-completewordmark-white-01.svg"
            alt="Anim-8"
            className="nav-logo-img"
          />
        </a>
        <ul className="nav-links">
          <li><a href="#work">Work</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#process">Process</a></li>
          <li><a href="#about">About</a></li>
        </ul>
        <a href="/contact" className="nav-cta">Start a Project</a>
        <button
          className={`hamburger-btn${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ══ MOBILE NAV ═══════════════════════════════════════ */}
      <div className={`mobile-nav${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <a href="#work"     onClick={closeMenu}>Work</a>
        <a href="#services" onClick={closeMenu}>Services</a>
        <a href="#process"  onClick={closeMenu}>Process</a>
        <a href="#about"    onClick={closeMenu}>About</a>
        <a href="#cta" className="mobile-nav-cta" onClick={closeMenu}>Start a Project</a>
      </div>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section id="hero">
        <div className="hero-bg">
          <iframe
            src="https://play.gumlet.io/embed/69068fe7a5b40b283e2e13b7?background=true&autoplay=true&loop=true&disable_player_controls=true&muted=true"
            className="hero-bg-video"
            allow="autoplay; fullscreen"
            referrerPolicy="origin"
            title=""
            aria-hidden="true"
          />
          <div className="hero-bg-overlay" />
        </div>
        <div className="container hero-content">
          <p className="hero-eyebrow">Anim-8</p>
          <h1 className="hero-h1">
            <span className="line"><span className="inner">We Build</span></span>
            <span className="line"><span className="inner">Worlds For</span></span>
            <span className="line"><span className="inner">Brands &amp; IP.</span></span>
          </h1>
          <p className="hero-sub">
            Most studios make assets. We build the universe around them.
          </p>
          <div className="hero-actions">
            <a href="#work" className="btn btn-fill">See Our Work</a>
            <a href="#cta" className="btn btn-outline">Work With Us</a>
          </div>
        </div>
        <div className="hero-scroll">
          <div className="scroll-bar" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ══ CLIENT STRIP ═════════════════════════════════════ */}
      <div id="clients">
        <div className="clients-track">
          {[...clientNames, ...clientNames, ...clientNames, ...clientNames].flatMap((name, i) => [
            clientLinks[name]
              ? <a key={`n${i}`} className="client-name" href={clientLinks[name]} target="_blank" rel="noopener noreferrer">{name}</a>
              : <span key={`n${i}`} className="client-name">{name}</span>,
            <span key={`d${i}`} className="client-dot" />,
          ])}
        </div>
      </div>

      {/* ══ ABOUT ════════════════════════════════════════════ */}
      <section id="about">
        <div className="container">
          <div className="about-grid">
            <div>
              <p className="section-tag reveal">What We Do</p>
              <h2 className="about-h2 reveal d1">
                We make things move.<br /><em>And brands</em> worth caring about.
              </h2>
            </div>
            <div className="about-right">
              <p className="about-body reveal">
                We&apos;re not an agency. We&apos;re a small studio that takes the work seriously.
                We work with founders and creative directors who want a real collaborator —
                not someone just executing a brief.
              </p>
              <blockquote className="about-quote reveal d1">
                Part studio, part creative partner. We&apos;re in it with you.
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SERVICES ═════════════════════════════════════════ */}
      <section id="services">
        <div className="container">
          <div className="services-head">
            <div>
              <p className="section-tag reveal">— WHAT WE BUILD</p>
              <h2 className="services-h2 reveal d1">
                STUDIO QUALITY.<br />WITHOUT THE FRICTION.
              </h2>
            </div>
          </div>
          <div className="services-grid">
            <div className="svc reveal">
              <p className="svc-num">01</p>
              <h3 className="svc-name">Character &amp; IP Animation</h3>
              <p className="svc-desc">
                Characters, worlds, expression systems.
                The kind of creative that sticks around long after the campaign ends.
              </p>
            </div>
            <div className="svc reveal d1">
              <p className="svc-num">02</p>
              <h3 className="svc-name">Brand Identity &amp; Design</h3>
              <p className="svc-desc">
                We design brands. Identity, systems, all the way through.
              </p>
            </div>
            <div className="svc reveal d2">
              <p className="svc-num">03</p>
              <h3 className="svc-name">Creative Direction</h3>
              <p className="svc-desc">
                A senior creative voice, without the overhead.
                For teams that need someone to push the creative further.
              </p>
            </div>
            <div className="svc reveal d3">
              <p className="svc-num">04</p>
              <h3 className="svc-name">Production Retainers</h3>
              <p className="svc-desc">
                Ongoing work, same quality, no drop-off.
                For brands that need to stay in the feed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ WORK GLOBE ═══════════════════════════════════════ */}
      <section id="work">
        <GlobeWork />
      </section>

      {/* ══ PROCESS ══════════════════════════════════════════ */}
      <section id="process">
        <div className="container">
          <div className="process-head">
            <p className="section-tag reveal">How It Works</p>
            <h2 className="process-h2 reveal d1">
              How we work.<br /><em>Every</em> time.
            </h2>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="step-n">01</div>
              <h3 className="step-name">Discovery</h3>
              <p className="step-desc">
                We ask the right questions before we touch anything.
                Goals, gaps, what actually matters.
              </p>
              <div className="step-mark"><span /><span /><span /></div>
            </div>
            <div className="step reveal d1">
              <div className="step-n">02</div>
              <h3 className="step-name">Creative Direction</h3>
              <p className="step-desc">
                The look, the logic, the structure —
                figured out before we start building.
              </p>
              <div className="step-mark"><span /><span /><span /></div>
            </div>
            <div className="step reveal d2">
              <div className="step-n">03</div>
              <h3 className="step-name">Production</h3>
              <p className="step-desc">
                We build fast and we build clean.
                No corners cut, no quality tax for moving quickly.
              </p>
              <div className="step-mark"><span /><span /><span /></div>
            </div>
            <div className="step reveal d3">
              <div className="step-n">04</div>
              <h3 className="step-name">Iteration</h3>
              <p className="step-desc">
                Fast turnarounds, honest back-and-forth.
                We don&apos;t disappear after delivery.
              </p>
              <div className="step-mark"><span /><span /><span /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════ */}
      <section id="cta">
        <div className="cta-bg-mark" aria-hidden="true">
          <img
            src="/images/logos/anim-8-logomark-white-uncompressed.svg"
            alt=""
          />
        </div>
        <div className="cta-glow" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <p className="section-tag reveal" style={{ justifyContent: 'center' }}>Let&apos;s Build</p>
          <h2 className="cta-h2 reveal d1">
            Ready to build<br />something<br /><em>worth watching?</em>
          </h2>
          <p className="cta-sub reveal d2">
            We take on a handful of projects each quarter.
            If the work matters to you, it&apos;ll matter to us.
          </p>
          <a href="/contact" className="btn btn-fill reveal d3">
            Start a Conversation →
          </a>
          <p className="cta-fine reveal d4">hello@anim-8.xyz · anim-8.xyz</p>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════ */}
      <footer>
        <div className="footer-logo-wrap">
          <img
            src="/images/logos/anim-8-completewordmark-white-01.svg"
            alt="Anim-8"
            className="footer-logo-img"
          />
        </div>
        <ul className="footer-links">
          <li><a href="#work">Work</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
        <p className="footer-copy">© 2026 Anim-8. All rights reserved.</p>
      </footer>
    </div>
  )
}
