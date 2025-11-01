'use client'

import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false })

interface VideoEmbedProps {
  url: string
  title?: string
  className?: string
}

export function VideoEmbed({ url, title, className }: VideoEmbedProps) {
  return (
    <div className={cn('relative aspect-video rounded-xl overflow-hidden bg-background-light', className)}>
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        light
        playing={false}
        config={{
          vimeo: {
            playerOptions: {
              title: true,
              byline: true,
              portrait: false,
            },
          },
        }}
      />
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-4">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
    </div>
  )
}

