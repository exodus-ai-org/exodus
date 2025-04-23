import { cn } from '@/lib/utils'
import { ImageOff } from 'lucide-react'
import { useState } from 'react'

export function LazyLoadImage({
  src,
  alt,
  className,
  skeletonClassName
}: {
  src: string
  alt: string
  className?: string
  skeletonClassName?: string
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden',
        className
      )}
    >
      {!isLoaded && !hasError && (
        <div
          className={cn(
            'bg-accent dark:bg-card absolute top-0 left-0 h-full w-full animate-pulse',
            skeletonClassName
          )}
        />
      )}

      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(true)
          }}
          className={`h-full w-full object-cover transition-opacity duration-700 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {hasError && (
        <div className="bg-accent dark:bg-card text-card dark:text-accent flex h-full w-full flex-col items-center justify-center">
          <ImageOff size={48} />
        </div>
      )}
    </div>
  )
}
