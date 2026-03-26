'use client'

import { useEffect, useState } from 'react'
import { getViewportTier, type ViewportTier } from '@/lib/viewportBreakpoints'

export function useViewportTier(): ViewportTier {
  const [tier, setTier] = useState<ViewportTier>(() =>
    typeof window !== 'undefined' ? getViewportTier(window.innerWidth) : 'tablet',
  )

  useEffect(() => {
    const sync = () => setTier(getViewportTier(window.innerWidth))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return tier
}
