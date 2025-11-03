'use client'

export function ConfidentialityBanner() {
  return (
    <div className="relative bg-gradient-to-r from-brand-navy via-[#1a1f3a] to-brand-navy border-b-2 border-lime-400/30 w-full max-w-full overflow-hidden">
      <div className="container-custom py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-full">
          {/* Lock Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-lime-400/20 to-emerald-400/20 border border-lime-400/30 flex items-center justify-center backdrop-blur-sm">
              <svg 
                className="w-4 h-4 sm:w-5 sm:h-5 text-lime-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="text-center sm:text-left max-w-full overflow-hidden px-2">
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-semibold uppercase tracking-wide leading-tight break-words">
              <span className="text-lime-400">Confidential Proposal</span>
              <span className="hidden sm:inline text-white/40 mx-2">•</span>
              <span className="block sm:inline mt-1 sm:mt-0">VeeFriends Character Production</span>
            </p>
            <p className="text-[10px] sm:text-xs text-white/50 mt-1 italic">
              For Authorized Review Only
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />
    </div>
  )
}

