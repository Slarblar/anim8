'use client'

import { useRef, useCallback } from 'react'

const GUMLET_BASE = 'https://play.gumlet.io/embed'

export const gumletThumb   = (id: string) => `${GUMLET_BASE}/${id}?autoplay=false&disable_player_controls=true&muted=true&preload=true&primary_color=7cc142`
export const gumletPlaying = (id: string) => `${GUMLET_BASE}/${id}?background=true&autoplay=true&loop=true&disable_player_controls=true&muted=true`
export const gumletModal   = (id: string) => `${GUMLET_BASE}/${id}?autoplay=true&loop=false&primary_color=7cc142`

export interface WorkItem {
  client: string
  title: string
  gumletId?: string
}

interface WorkCardProps {
  item: WorkItem
  index: number
  className?: string
  onClick: () => void
}

export function WorkCard({ item, className = '', onClick }: WorkCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleMouseEnter = useCallback(() => {
    if (item.gumletId && iframeRef.current) {
      iframeRef.current.src = gumletPlaying(item.gumletId)
    }
  }, [item.gumletId])

  const handleMouseLeave = useCallback(() => {
    if (item.gumletId && iframeRef.current) {
      iframeRef.current.src = gumletThumb(item.gumletId)
    }
  }, [item.gumletId])

  return (
    <div
      className={`wc${item.gumletId ? ' has-video' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="wc-placeholder" />

      <div className="wc-preview">
        {item.gumletId && (
          <iframe
            ref={iframeRef}
            src={gumletThumb(item.gumletId)}
            allow="autoplay; encrypted-media; fullscreen"
            referrerPolicy="origin"
            title={item.client}
            className="wc-gumlet"
          />
        )}
      </div>

      <div className="wc-overlay">
        <div className="wc-play">
          <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
        </div>
        <div className="wc-meta">
          <p className="wc-client">{item.client}</p>
          <h3 className="wc-title">{item.title}</h3>
        </div>
      </div>
    </div>
  )
}
