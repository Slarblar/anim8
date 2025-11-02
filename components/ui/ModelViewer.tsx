'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ModelViewerProps {
  src?: string // GLB file path - optional for now
  alt?: string
  poster?: string // Placeholder image while loading
  autoRotate?: boolean
  cameraControls?: boolean
  className?: string
}

export function ModelViewer({
  src = '', // Empty for now, will be populated later
  alt = '3D Model',
  poster,
  autoRotate = true,
  cameraControls = true,
  className
}: ModelViewerProps) {
  const modelViewerRef = useRef<HTMLElement>(null)

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

  return (
    <div className={cn('relative aspect-video rounded-xl overflow-hidden', className)}>
      <model-viewer
        ref={modelViewerRef as any}
        src={src || undefined}
        alt={alt}
        poster={poster}
        camera-controls={cameraControls ? '' : undefined}
        auto-rotate={autoRotate ? '' : undefined}
        auto-rotate-delay="0"
        rotation-per-second="30deg"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'transparent',
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

