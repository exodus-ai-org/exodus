import { TEST_IDS } from '@shared/constants/test-ids'
import { PlayIcon } from 'lucide-react'

import { LazyLoadImage } from '@/components/lazy-load-image'
import { SourceFavicon } from '@/components/source-favicon'

import type { GalleryVideo } from './collect-gallery-videos'

export function VideoCards({ videos }: { videos: GalleryVideo[] }) {
  if (videos.length === 0) return null

  return (
    <div className="my-3 flex gap-3 overflow-x-auto pb-1">
      {videos.map((video) => (
        <a
          key={video.url}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={TEST_IDS.video.card}
          className="w-52 shrink-0"
        >
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <LazyLoadImage
              src={video.thumbnailUrl}
              alt={video.title}
              className="size-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white">
                <PlayIcon size={18} className="translate-x-px fill-current" />
              </span>
            </div>
            {video.duration && (
              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                {video.duration}
              </span>
            )}
          </div>
          <div className="mt-1.5 line-clamp-2 text-sm font-medium">
            {video.title}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
            <SourceFavicon link={video.url} className="size-3.5" />
            {video.source && <span className="truncate">{video.source}</span>}
          </div>
        </a>
      ))}
    </div>
  )
}
