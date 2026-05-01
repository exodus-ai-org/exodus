import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { memo, useEffect, useMemo, useRef } from 'react'

import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { buildPlacePhotoUrl, type ItineraryPlace } from './types'

type DayLayerProps = {
  places: ItineraryPlace[]
  focusedIdx: number | null
  onMarkerClick: (idx: number) => void
}

// PlaceDetail panel: w-80 (320 px) + right-3 gap (12 px) + visual buffer.
// Floors at 432 so the card is always visually clear on narrow containers.
// `containerWidth || 800` avoids the 0-before-layout case where Math.max
// would produce 0 instead of the intended minimum.
function computeRightPad(containerWidth: number): number {
  return Math.max(432, Math.round((containerWidth || 800) * 0.55))
}

/**
 * Renders the active day's markers + polyline and fits the map to the day's
 * bounds when the place set changes. Each marker is a small square photo
 * thumbnail (Places API photo if available, else a numbered tile) with a
 * numeric badge — click opens the detail overlay. Lives inside <Map>
 * because it needs the map instance from useMap().
 */
export function DayLayer({ places, focusedIdx, onMarkerClick }: DayLayerProps) {
  const map = useMap()
  const { data: settings } = useSettings()
  const apiKey = settings?.googleCloud?.googleApiKey

  // After fitBounds re-positions the map to the padded left area, the panTo
  // effect would fire on the same commit (focusedIdx=0 on mount/day-switch)
  // and re-center on place[0], undoing the leftward offset.  This flag tells
  // panTo to skip exactly once after each fitBounds call.
  const skipNextPanToRef = useRef(true)

  // Fit bounds on tab switch (places change). Single-place days center+zoom
  // instead so the lone pin doesn't get placed on a continental view.
  useEffect(() => {
    if (!map || places.length === 0) return
    skipNextPanToRef.current = true
    if (places.length === 1) {
      map.setCenter({ lat: places[0].lat, lng: places[0].lng })
      map.setZoom(15)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const p of places) bounds.extend({ lat: p.lat, lng: p.lng })
    map.fitBounds(bounds, {
      top: 64,
      right: computeRightPad(map.getDiv()?.clientWidth ?? 0),
      bottom: 32,
      left: 32
    })
  }, [map, places])

  // Pan-without-zoom when the user scrubs through pins via prev/next or by
  // clicking an entry — keeps the surrounding context intact.
  useEffect(() => {
    if (!map || focusedIdx == null) return
    if (skipNextPanToRef.current) {
      skipNextPanToRef.current = false
      return
    }
    const p = places[focusedIdx]
    if (!p) return
    map.panTo({ lat: p.lat, lng: p.lng })
  }, [map, focusedIdx, places])

  // Imperative polyline so we can clean it up cleanly on remount (tab swap).
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  useEffect(() => {
    if (!map) return
    const path = places.map((p) => ({ lat: p.lat, lng: p.lng }))
    const line = new google.maps.Polyline({
      path,
      strokeColor: '#4285F4',
      strokeOpacity: 0.85,
      strokeWeight: 3,
      zIndex: 2
    })
    line.setMap(map)
    polylineRef.current = line
    return () => {
      line.setMap(null)
      polylineRef.current = null
    }
  }, [map, places])

  return (
    <>
      {places.map((p, i) => (
        <AdvancedMarker
          key={`${p.lat}-${p.lng}-${i}`}
          position={{ lat: p.lat, lng: p.lng }}
          onClick={() => onMarkerClick(i)}
          zIndex={focusedIdx === i ? 100 : 10}
        >
          <ThumbnailPin
            place={p}
            index={i}
            focused={focusedIdx === i}
            apiKey={apiKey ?? undefined}
          />
        </AdvancedMarker>
      ))}
    </>
  )
}

/** Square photo thumbnail with a number badge and a name label below.
 *  Memoized — only re-renders when its own props change, so changing
 *  `focusedIdx` on the parent doesn't re-evaluate every pin. */
const ThumbnailPin = memo(function ThumbnailPin({
  place,
  index,
  focused,
  apiKey
}: {
  place: ItineraryPlace
  index: number
  focused: boolean
  apiKey: string | undefined
}) {
  // Use a small thumbnail size (240px) instead of the detail-card size — the
  // pin is only ~32px on screen so we don't need a high-res photo.
  const photoUrl = useMemo(
    () => buildPlacePhotoUrl(place.photoNames?.[0], apiKey, 240) ?? undefined,
    [place.photoNames, apiKey]
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center transition-transform',
        focused && 'scale-110'
      )}
      style={{ transform: 'translateY(-50%)' }}
    >
      <div className="relative">
        {photoUrl ? (
          <div
            className={cn(
              'border-background size-8 overflow-hidden rounded-md border-2 shadow-md',
              focused && 'ring-primary ring-2'
            )}
          >
            <img
              src={photoUrl}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              'border-background bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md border-2 text-xs font-semibold shadow-md',
              focused && 'ring-primary ring-2'
            )}
          >
            {index + 1}
          </div>
        )}
        <span
          className={cn(
            'border-background absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full border text-[9px] font-semibold shadow-sm z-1',
            focused
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-foreground'
          )}
        >
          {index + 1}
        </span>
      </div>
      <span
        className="bg-background/85 text-foreground mt-1 max-w-30 truncate rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm"
        title={place.name}
      >
        {place.name}
      </span>
    </div>
  )
})
