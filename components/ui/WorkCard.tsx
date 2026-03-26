'use client'

import { useState, useCallback } from 'react'

const GUMLET_BASE  = 'https://play.gumlet.io/embed'
const GUMLET_THUMB = 'https://video.gumlet.io'

export const gumletThumbImg = (id: string) => `${GUMLET_THUMB}/${id}/thumbnail.jpg`
export const gumletPlaying  = (id: string) => `${GUMLET_BASE}/${id}?background=true&autoplay=true&loop=true&disable_player_controls=true&muted=true`
export const gumletModal    = (id: string) =>
  `${GUMLET_BASE}/${id}?autoplay=true&loop=false&primary_color=7cc142&start_high_res=true`

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
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = useCallback(() => {
    if (item.gumletId) setHovered(true)
  }, [item.gumletId])

  const handleMouseLeave = useCallback(() => {
    if (item.gumletId) setHovered(false)
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

      {item.gumletId && (
        <div className="wc-preview">
          {hovered ? (
            <iframe
              src={gumletPlaying(item.gumletId)}
              allow="autoplay; encrypted-media; fullscreen"
              referrerPolicy="origin"
              title={item.client}
              className="wc-gumlet"
            />
          ) : (
            <img
              src={gumletThumbImg(item.gumletId)}
              alt={item.client}
              className="wc-gumlet-thumb"
            />
          )}
        </div>
      )}

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
