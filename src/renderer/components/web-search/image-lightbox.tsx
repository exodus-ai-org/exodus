// src/renderer/components/web-search/image-lightbox.tsx
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageOffIcon,
  LoaderIcon,
  XIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { SourceFavicon } from '@/components/source-favicon'
import { cn } from '@/lib/utils'

import type { GalleryImage } from './collect-gallery-images'

// Dots only stay legible up to a handful; Brave caps image media at 8 anyway.
const MAX_DOTS = 8

/**
 * The stage image. External URLs load slowly, so we never blank out or leave
 * the previous frame on screen: the already-cached grid thumbnail paints
 * immediately (blurred, as a backdrop) and the full-resolution image fades in
 * over it once decoded. Keyed by `image.url` in the parent, so every step
 * remounts with fresh state.
 */
function LightboxImage({ image }: { image: GalleryImage }) {
  const { t } = useTranslation('webSearch')
  const [loaded, setLoaded] = useState(false)
  const [fullError, setFullError] = useState(false)
  const [thumbError, setThumbError] = useState(false)
  const hasThumb = Boolean(image.thumbnailUrl) && !thumbError

  if (fullError && !hasThumb) {
    return (
      <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
        <ImageOffIcon size={44} />
        <span className="text-sm">{t('imageLightbox.imageUnavailable')}</span>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
      {hasThumb && (!loaded || fullError) && (
        <img
          src={image.thumbnailUrl}
          alt={image.title}
          aria-hidden={!fullError}
          onError={() => setThumbError(true)}
          className={cn(
            'absolute max-h-full max-w-full object-contain transition-[filter,transform] duration-300',
            fullError ? '' : 'scale-105 blur-2xl brightness-95'
          )}
        />
      )}

      {!fullError && (
        <img
          src={image.url}
          alt={image.title}
          onLoad={() => setLoaded(true)}
          onError={() => setFullError(true)}
          className={cn(
            'relative max-h-full max-w-full object-contain transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {!loaded && !fullError && (
        <div className="bg-background/70 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur">
          <LoaderIcon
            size={16}
            className="text-muted-foreground animate-spin"
          />
        </div>
      )}

      {fullError && hasThumb && (
        <div className="bg-background/70 text-muted-foreground absolute bottom-3 rounded-full px-3 py-1 text-xs backdrop-blur">
          {t('imageLightbox.previewOnly')}
        </div>
      )}
    </div>
  )
}

function NavButton({
  direction,
  onClick,
  testId
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  testId: string
}) {
  const { t } = useTranslation('webSearch')
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      aria-label={
        direction === 'prev'
          ? t('imageLightbox.previousImage')
          : t('imageLightbox.nextImage')
      }
      className={cn(
        'bg-background/70 text-foreground ring-border hover:bg-background absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full shadow-md ring-1 backdrop-blur transition',
        direction === 'prev' ? 'left-4' : 'right-4'
      )}
    >
      <Icon size={22} />
    </button>
  )
}

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
  const { t } = useTranslation(['common', 'webSearch'])
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

  // Warm the browser cache for the neighbouring frames so stepping through the
  // carousel is instant after the first visit.
  useEffect(() => {
    for (const i of [index + 1, index - 1]) {
      const neighbour = images[i]
      if (neighbour) {
        const img = new Image()
        img.src = neighbour.url
      }
    }
  }, [index, images])

  const current = images[index]
  if (!current) return null

  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="bg-background/95 animate-in fade-in fixed inset-0 z-[100] flex flex-col backdrop-blur-xl duration-150"
      onClick={closeOnBackdrop}
    >
      <div className="flex h-12 shrink-0 items-center px-3">
        <button
          type="button"
          onClick={onClose}
          data-testid={TEST_IDS.gallery.lightboxClose}
          aria-label={t('action.close')}
          className="text-muted-foreground hover:bg-foreground/10 hover:text-foreground flex size-8 items-center justify-center rounded-full transition"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        onClick={closeOnBackdrop}
      >
        {!atStart && (
          <NavButton
            direction="prev"
            onClick={() => onIndexChange(index - 1)}
            testId={TEST_IDS.gallery.lightboxPrev}
          />
        )}

        <LightboxImage key={current.url} image={current} />

        {!atEnd && (
          <NavButton
            direction="next"
            onClick={() => onIndexChange(index + 1)}
            testId={TEST_IDS.gallery.lightboxNext}
          />
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3 px-4 pt-2 pb-6">
        {images.length > 1 &&
          (images.length <= MAX_DOTS ? (
            <div className="flex items-center gap-1.5">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  data-testid={TEST_IDS.gallery.lightboxDot}
                  aria-label={t('webSearch:imageLightbox.goToImage', {
                    index: i + 1
                  })}
                  aria-current={i === index || undefined}
                  className={cn(
                    'h-1.5 rounded-full transition-[width,background-color]',
                    i === index
                      ? 'bg-foreground w-5'
                      : 'bg-foreground/25 hover:bg-foreground/50 w-1.5'
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="bg-foreground/8 text-muted-foreground rounded-full px-2.5 py-1 text-xs tabular-nums">
              {index + 1} / {images.length}
            </div>
          ))}

        <a
          href={current.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground flex max-w-2xl items-center gap-2 text-sm"
        >
          <SourceFavicon link={current.sourceUrl} className="size-4" />
          <span className="truncate">{current.title}</span>
        </a>
      </div>
    </div>,
    document.body
  )
}
