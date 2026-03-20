import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ImageOffIcon } from 'lucide-react'
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
        'relative flex size-full items-center justify-center overflow-hidden',
        className
      )}
    >
      {!isLoaded && !hasError && (
        <Skeleton
          className={cn(
            'absolute top-0 left-0 size-full rounded-none',
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
          className={`size-full object-cover transition-opacity duration-700 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {hasError && (
        <div className="bg-accent text-card flex size-full flex-col items-center justify-center">
          <ImageOffIcon size={48} />
        </div>
      )}
    </div>
  )
}
