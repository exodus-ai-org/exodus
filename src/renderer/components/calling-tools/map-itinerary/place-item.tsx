import { StarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ItineraryPlace = {
  name: string
  lat: number
  lng: number
  photoUrl?: string
  rating?: number
  reviewCount?: number
  type?: string
  timeLabel?: string
  note?: string
}

type PlaceItemProps = {
  place: ItineraryPlace
  index: number
  isFocused: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}

function formatReviewCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toString()
}

export function PlaceItem({
  place,
  index,
  isFocused,
  onHover,
  onLeave,
  onClick
}: PlaceItemProps) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      onClick={onClick}
      className={cn(
        'group relative flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors',
        'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
        isFocused && 'bg-muted/60'
      )}
    >
      {/* Numbered chip aligned with the map pin so cross-referencing is obvious */}
      <span
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
          isFocused
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground group-hover:bg-primary/15'
        )}
      >
        {index + 1}
      </span>

      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt=""
          loading="lazy"
          className="bg-muted size-12 shrink-0 rounded-md object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-foreground line-clamp-1 text-sm font-medium">
              {place.name}
            </div>
            {(place.rating !== undefined || place.type) && (
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                {place.rating !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <StarIcon
                      size={11}
                      className="fill-amber-500 text-amber-500"
                    />
                    <span className="text-foreground font-medium">
                      {place.rating.toFixed(1)}
                    </span>
                    {place.reviewCount !== undefined && (
                      <span>({formatReviewCount(place.reviewCount)})</span>
                    )}
                  </span>
                )}
                {place.rating !== undefined && place.type && (
                  <span aria-hidden>·</span>
                )}
                {place.type && <span>{place.type}</span>}
              </div>
            )}
          </div>
          {place.timeLabel && (
            <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
              {place.timeLabel}
            </span>
          )}
        </div>
        {place.note && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {place.note}
          </p>
        )}
      </div>
    </button>
  )
}
