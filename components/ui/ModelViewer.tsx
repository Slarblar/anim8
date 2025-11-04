                                                    'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { FiRefreshCw } from 'react-icons/fi'

interface ModelViewerProps {
  src?: string // GLB file path - optional for now
  alt?: string
  poster?: string // Placeholder image while loading
  autoRotate?: boolean
  cameraControls?: boolean
  scale?: string // Scale factor (e.g., "0.8" for 80% size)
  rotationPerSecond?: string // Rotation speed (e.g., "21deg")
  className?: string
}

export function ModelViewer({
  src = '', // Empty for now, will be populated later
  alt = '3D Model',
  poster,
  autoRotate = true,
  cameraControls = true,
  scale = '1',
  rotationPerSecond = '30deg',
  className
}: ModelViewerProps) {
  const modelViewerRef = useRef<HTMLElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Dynamically load the Google Model Viewer script
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js'
    
    if (!document.querySelector('script[src*="model-viewer"]')) {
      document.head.appendChild(script)
    }

    return () => {
      // Cleanup if needed
    }
  }, [])

  const handleReset = () => {
    if (modelViewerRef.current) {
      const viewer = modelViewerRef.current as any
      // Reset camera orbit to default
      viewer.resetTurntableRotation?.()
      viewer.cameraOrbit = viewer.getAttribute('camera-orbit') || 'auto auto auto'
      viewer.fieldOfView = 'auto'
      // Reset panning by resetting camera target to model center
      viewer.cameraTarget = 'auto auto auto'
      viewer.jumpCameraToGoal()
    }
  }

  return (
    <div className={cn('relative aspect-square md:aspect-video rounded-xl overflow-hidden', className)}>
      <model-viewer
        ref={modelViewerRef as any}
        src={src || undefined}
        alt={alt}
        poster={poster}
        camera-controls={cameraControls ? '' : undefined}
        auto-rotate={autoRotate ? '' : undefined}
        auto-rotate-delay="0"
        rotation-per-second={rotationPerSecond}
        touch-action="pan-x pan-y"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
          touchAction: 'pan-x pan-y',
          transform: `scale(${scale})`,
        }}
      >
        {/* Placeholder content when no model is loaded */}
        {!src && (
          <div 
            slot="poster" 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(0, 255, 194, 0.1), rgba(191, 255, 0, 0.1))',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎨</div>
              <p>3D Model Viewer<br />GLB file will be inserted here</p>
            </div>
          </div>
        )}
      </model-viewer>

      {/* Reset View Button */}
      {src && (
        <button
          onClick={handleReset}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300"
          style={{
            background: isHovered 
              ? 'rgba(124, 193, 66, 0.2)' 
              : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(124, 193, 66, 0.3)',
            boxShadow: isHovered 
              ? '0 4px 12px rgba(124, 193, 66, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.2)',
            cursor: 'pointer',
          }}
          aria-label="Reset camera view"
          title="Reset View"
        >
          <FiRefreshCw 
            className="transition-transform duration-300" 
            style={{ 
              color: '#7cc142',
              fontSize: '16px',
              transform: isHovered ? 'rotate(-180deg)' : 'rotate(0deg)'
            }} 
          />
          <span 
            style={{ 
              fontSize: '13px', 
              fontWeight: 500,
              color: isHovered ? '#7cc142' : 'rgba(255, 255, 255, 0.8)',
              transition: 'color 0.3s'
            }}
          >
            Reset
          </span>
        </button>
      )}
    </div>
  )
}

// Type declaration for model-viewer custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any
    }
  }
}

