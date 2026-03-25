'use client'

import { useEffect, useCallback } from 'react'
import { WorkItem, gumletModal } from './WorkCard'

interface WorkModalProps {
  items: WorkItem[]
  activeIdx: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (idx: number) => void
}

export function WorkModal({ items, activeIdx, isOpen, onClose, onNavigate }: WorkModalProps) {
  const current = items[activeIdx]

  const handleClose = useCallback(() => {
    document.body.style.overflow = ''
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight') onNavigate((activeIdx + 1) % items.length)
      if (e.key === 'ArrowLeft') onNavigate((activeIdx - 1 + items.length) % items.length)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, activeIdx, items.length, handleClose, onNavigate])

  return (
    <div
      id="lp-modal"
      className={isOpen ? 'open' : ''}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="modal-wrap">

        <div className="modal-video">
          {isOpen && current.gumletId ? (
            <iframe
              key={`${current.gumletId}-${activeIdx}`}
              src={gumletModal(current.gumletId)}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="origin"
              title={current.client}
              className="modal-video-iframe"
            />
          ) : (
            <div className="modal-ph">[ VIDEO PLAYBACK ]</div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-info">
            <p className="modal-client-label">{current.client}</p>
            <h3 className="modal-title-text">{current.title}</h3>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-nav-row">
          {items.map((item, i) => (
            <div
              key={i}
              className={`mnav${i === activeIdx ? ' active' : ''}`}
              onClick={() => onNavigate(i)}
            >
              <div className="mn-client">{item.client}</div>
              <div className="mn-title">{item.title}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
