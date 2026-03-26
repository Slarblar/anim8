'use client'

import { GlobeModalImageCarousel } from './GlobeModalImageCarousel'
import { useViewportTier } from '@/hooks/useViewportTier'

export type GlobeWorkGalleryState = {
  srcs: string[]
  format: 'landscape' | 'portrait'
  accent: string
} | null

export function GlobeWorkModal({ globeGallery }: { globeGallery: GlobeWorkGalleryState }) {
  const tier = useViewportTier()

  return (
    <div id="globe-modal-overlay" className="globe-modal-overlay" data-vm-tier={tier}>
      <div id="globe-modal-card" className="globe-modal-card">
        <button type="button" id="globe-modal-close" className="globe-modal-close" aria-label="Close">
          &#x2715;
        </button>
        <canvas id="globe-modal-canvas" className="globe-modal-canvas" />
        <div id="globe-modal-video-wrap" className="globe-modal-video-wrap" style={{ display: 'none' }}>
          <iframe
            id="globe-modal-iframe"
            className="globe-modal-iframe"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="origin"
            title="Work preview"
          />
        </div>
        <div
          className="globe-modal-gallery-wrap"
          style={{ display: globeGallery ? 'block' : 'none' }}
          aria-hidden={!globeGallery}
        >
          {globeGallery ? (
            <GlobeModalImageCarousel
              images={globeGallery.srcs}
              format={globeGallery.format}
              accent={globeGallery.accent}
            />
          ) : null}
        </div>
        <div id="globe-modal-body" className="globe-modal-body">
          <div id="globe-modal-eyebrow" className="globe-modal-eyebrow">
            <span id="globe-modal-label" className="globe-modal-label" />
            <span id="globe-modal-format-tag" className="globe-modal-format-tag" />
          </div>
          <div id="globe-modal-title" className="globe-modal-title" />
          <div id="globe-modal-desc" className="globe-modal-desc" />
          <div id="globe-modal-glow-bar" className="globe-modal-glow-bar" />
        </div>
      </div>
    </div>
  )
}
