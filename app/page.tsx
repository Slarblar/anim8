'use client'

import { useEffect, useState } from 'react'

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 md:px-10 py-10 bg-gradient-to-br from-[#0F172A] via-[#1a1f3a] to-[#0F172A]">
      <div className="max-w-[800px] w-full text-center space-y-8">
        {/* Logo */}
        <div 
          className={`transition-all duration-600 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <div className="w-[240px] md:w-[320px] mx-auto mb-8">
            <img 
              src="/images/logos/anim-8-logomark-original-01-01.svg" 
              alt="Anim-8 Logo" 
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Description */}
        <div 
          className={`text-[15px] md:text-[16px] text-white/70 leading-[1.8] space-y-4 transition-all duration-600 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ 
            fontFamily: 'futura-pt, sans-serif',
            transitionDelay: '200ms'
          }}
        >
          <p>
            Led by RTFKT co-founder Chris Le and Spacestation Animation's Jordan Nguyen, 
            Anim-8 specializes in rapid character production for IP development.
          </p>
        </div>

        {/* Contact Info */}
        <div 
          className={`text-[15px] text-white/80 space-y-2 transition-all duration-600 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ 
            fontFamily: 'futura-pt, sans-serif',
            transitionDelay: '400ms'
          }}
        >
          <p>For project inquiries:</p>
          <p className="space-x-4">
            <a 
              href="mailto:jordan@anim-8.xyz" 
              className="text-[#7cc142] hover:text-[#8bd253] transition-all duration-200 hover:scale-[1.02] inline-block"
            >
              jordan@anim-8.xyz
            </a>
            <span className="text-white/40">|</span>
            <a 
              href="tel:+19073069306" 
              className="text-[#7cc142] hover:text-[#8bd253] transition-all duration-200 hover:scale-[1.02] inline-block"
            >
              907-306-9306
            </a>
          </p>
        </div>

        {/* Coming Soon */}
        <p 
          className={`text-[13px] text-white/50 italic transition-all duration-600 ease-out ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
          style={{ 
            fontFamily: 'futura-pt, sans-serif',
            transitionDelay: '600ms'
          }}
        >
          Full portfolio site launching soon.
        </p>
      </div>
    </div>
  )
}
