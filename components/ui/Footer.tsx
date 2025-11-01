'use client'

export function Footer() {
  return (
    <footer className="bg-brand-black py-12">
      <div className="container-custom">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Tagline */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white mb-2">ANIM-8</h3>
              <p className="text-text-muted">
                Content Infrastructure for the AI Era
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#approach" className="text-text-muted hover:text-brand-lime transition-colors">
                  Our Approach
                </a>
              </li>
              <li>
                <a href="#packages" className="text-text-muted hover:text-brand-lime transition-colors">
                  Packages
                </a>
              </li>
              <li>
                <a href="#team" className="text-text-muted hover:text-brand-lime transition-colors">
                  Team
                </a>
              </li>
              <li>
                <a href="#cta" className="text-text-muted hover:text-brand-lime transition-colors">
                  Get Started
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="mailto:jordan@anim-8.xyz" className="hover:text-brand-cyan transition-colors">
                  jordan@anim-8.xyz
                </a>
              </li>
              <li>
                <a href="tel:+19073069306" className="hover:text-brand-cyan transition-colors">
                  907-306-9306
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-lime/20 to-transparent mb-8" />

        {/* Copyright */}
        <div className="text-center text-text-muted text-sm">
          <p>&copy; {new Date().getFullYear()} ANIM-8 Studio. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

