'use client'

export function Footer() {
  return (
    <footer className="bg-brand-black py-12">
      <div className="container-custom">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Tagline */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <h3 className="text-2xl font-black text-white mb-2">Anim-8.xyz</h3>
              <p className="text-text-muted">
                Building IP infrastructure for the AI era.
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-bold mb-4">SERVICES</h4>
            <ul className="space-y-2">
              <li>
                <a href="#capability" className="text-text-muted hover:text-brand-lime transition-colors">
                  3D Character Production
                </a>
              </li>
              <li>
                <a href="#packages" className="text-text-muted hover:text-brand-lime transition-colors">
                  Rigging & Animation
                </a>
              </li>
              <li>
                <a href="#packages" className="text-text-muted hover:text-brand-lime transition-colors">
                  SORA Training Datasets
                </a>
              </li>
              <li>
                <a href="#team" className="text-text-muted hover:text-brand-lime transition-colors">
                  Pipeline Development
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold mb-4">COMPANY</h4>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a href="#vision" className="hover:text-brand-cyan transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#team" className="hover:text-brand-cyan transition-colors">
                  Team
                </a>
              </li>
              <li>
                <a href="#cta" className="hover:text-brand-cyan transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-lime/20 to-transparent mb-8" />

        {/* Copyright */}
        <div className="text-center text-text-muted text-sm space-y-2">
          <p>&copy; 2025 Anim-8. All rights reserved.</p>
          <p className="text-xs italic">
            This proposal is confidential and intended solely for VeeFriends and partners.
          </p>
        </div>
      </div>
    </footer>
  )
}

