// src/renderer/components/web-search/image-lightbox.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { SourceFavicon } from '@/components/source-favicon'

import type { GalleryImage } from './collect-gallery-images'

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose
}: {
  images: GalleryImage[]
  index: number
  onIndexChange: (next: number) => void
  onClose: () => void
}) {
  const atStart = index <= 0
  const atEnd = index >= images.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      else if (e.key === 'ArrowRight' && index < images.length - 1)
        onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onIndexChange, onClose])

  const current = images[index]
  if (!current) return null

  return createPortal(
    <div className="bg-background/95 fixed inset-0 z-[100] flex flex-col">
      <div className="flex h-12 shrink-0 items-center px-3">
        <button
          type="button"
          onClick={onClose}
          data-testid={TEST_IDS.gallery.lightboxClose}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md"
        >
          <XIcon size={18} />
        </button>
        <div className="text-muted-foreground flex-1 text-center text-sm tabular-nums">
          {index + 1} / {images.length}
        </div>
        <div className="size-8" />
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-4">
        <button
          type="button"
          onClick={() => !atStart && onIndexChange(index - 1)}
          disabled={atStart}
          data-testid={TEST_IDS.gallery.lightboxPrev}
          aria-label="Previous"
          className="text-muted-foreground hover:text-foreground absolute left-3 inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronLeftIcon size={24} />
        </button>

        <img
          src={current.url}
          alt={current.title}
          className="max-h-full max-w-full object-contain"
        />

        <button
          type="button"
          onClick={() => !atEnd && onIndexChange(index + 1)}
          disabled={atEnd}
          data-testid={TEST_IDS.gallery.lightboxNext}
          aria-label="Next"
          className="text-muted-foreground hover:text-foreground absolute right-3 inline-flex size-10 items-center justify-center rounded-full disabled:opacity-30"
        >
          <ChevronRightIcon size={24} />
        </button>
      </div>

      <a
        href={current.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground mx-auto mb-6 flex max-w-2xl items-center gap-2 px-4 text-sm"
      >
        <SourceFavicon link={current.sourceUrl} className="size-4" />
        <span className="truncate">{current.title}</span>
      </a>
    </div>,
    document.body
  )
}
