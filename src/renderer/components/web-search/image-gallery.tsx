// src/renderer/components/web-search/image-gallery.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { ImagesIcon } from 'lucide-react'
import { useState } from 'react'

import { LazyLoadImage } from '@/components/lazy-load-image'

import type { GalleryImage } from './collect-gallery-images'
import { ImageLightbox } from './image-lightbox'

const MAX_THUMBS = 3

export function ImageGallery({ images }: { images: GalleryImage[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null)
  if (images.length === 0) return null

  const thumbs = images.slice(0, MAX_THUMBS)
  const hasMore = images.length > MAX_THUMBS

  return (
    <div className="my-3">
      <div className="flex gap-2">
        {thumbs.map((img, i) => {
          const isLastWithMore = i === MAX_THUMBS - 1 && hasMore
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => setOpenAt(i)}
              data-testid={TEST_IDS.gallery.thumbnail}
              className="relative h-36 flex-1 overflow-hidden rounded-xl"
            >
              <LazyLoadImage
                src={img.thumbnailUrl}
                alt={img.title}
                className="size-full"
              />
              {isLastWithMore && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 text-sm font-medium text-white">
                  <ImagesIcon size={16} /> {images.length}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {openAt !== null && (
        <ImageLightbox
          images={images}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </div>
  )
}
