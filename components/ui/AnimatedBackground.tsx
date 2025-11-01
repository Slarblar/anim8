'use client'

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orb 1 - Lime */}
      <div 
        className="gradient-orb gradient-orb-1"
        style={{
          top: '-10%',
          left: '10%',
        }}
      />
      
      {/* Gradient Orb 2 - Cyan */}
      <div 
        className="gradient-orb gradient-orb-2"
        style={{
          top: '30%',
          right: '5%',
        }}
      />
      
      {/* Gradient Orb 3 - Pink */}
      <div 
        className="gradient-orb gradient-orb-3"
        style={{
          bottom: '10%',
          left: '20%',
        }}
      />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 grid-background opacity-50" />
    </div>
  )
}

