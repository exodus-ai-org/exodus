import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { useClipboard } from '@/hooks/use-clipboard'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { DayLayer } from './day-layer'
import { PlaceDetail } from './place-detail'
import type { ItineraryDay, MapItineraryDetails } from './types'

const MODE_TO_GMAPS_PARAM: Record<
  NonNullable<ItineraryDay['routeMode']>,
  string
> = {
  walking: 'walking',
  driving: 'driving',
  transit: 'transit'
}

// Map static props hoisted to module scope so they don't allocate fresh
// objects on every render — saves React from comparing identity-different
// but value-equal objects, and makes it obvious these are inert.
const MAP_DEFAULT_CENTER = { lat: 0, lng: 0 }
const MAP_DEFAULT_ZOOM = 2
const MAP_LIBRARIES: ['geometry'] = ['geometry']
const MAP_ID = 'exodus-itinerary'

/** Build a Google Maps deep-link that opens the day's route with all
 *  waypoints in order. */
function buildGoogleMapsUrl(day: ItineraryDay): string | null {
  const places = day.places
  if (places.length === 0) return null
  if (places.length === 1) {
    const p = places[0]
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
  }
  const origin = places[0]
  const destination = places[places.length - 1]
  const waypoints = places.slice(1, -1)
  const url = new URL('https://www.google.com/maps/dir/')
  url.searchParams.set('api', '1')
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`)
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`)
  if (waypoints.length > 0) {
    url.searchParams.set(
      'waypoints',
      waypoints.map((p) => `${p.lat},${p.lng}`).join('|')
    )
  }
  url.searchParams.set(
    'travelmode',
    MODE_TO_GMAPS_PARAM[day.routeMode ?? 'walking']
  )
  return url.toString()
}

/** Markdown summary of a day for the Copy button — pastes into another
 *  chat / notes app preserving structure. */
function buildDayMarkdown(day: ItineraryDay): string {
  const header = `## ${day.label}${day.title ? ` — ${day.title}` : ''}`
  const summary = day.summary ? `\n${day.summary}\n` : ''
  const places = day.places
    .map((p, i) => {
      const lines: string[] = []
      lines.push(`${i + 1}. **${p.name}**`)
      const meta: string[] = []
      if (p.type) meta.push(p.type)
      if (p.rating !== undefined) meta.push(`★ ${p.rating.toFixed(1)}`)
      if (p.timeLabel) meta.push(p.timeLabel)
      if (meta.length) lines.push(`   ${meta.join(' · ')}`)
      if (p.note) lines.push(`   ${p.note}`)
      if (p.address) lines.push(`   ${p.address}`)
      if (p.phone) lines.push(`   ${p.phone}`)
      if (p.websiteUri) lines.push(`   ${p.websiteUri}`)
      lines.push(
        `   ${p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}`
      )
      return lines.join('\n')
    })
    .join('\n\n')
  return `${header}${summary}\n${places}`
}

/** Inner Map subtree, isolated and memoized so interactive state in the
 *  parent (focusedPlaceIdx, copy-button confirm flash) doesn't trigger a
 *  Map re-render. The Map itself is the most expensive thing in this card
 *  by far — keeping its prop set stable avoids any chance of remount. */
const MapSurface = memo(function MapSurface({
  apiKey,
  colorScheme,
  activeDayIdx,
  places,
  focusedIdx,
  onMarkerClick
}: {
  apiKey: string
  colorScheme: 'LIGHT' | 'DARK'
  activeDayIdx: number
  places: ItineraryDay['places']
  focusedIdx: number | null
  onMarkerClick: (idx: number) => void
}) {
  return (
    <APIProvider apiKey={apiKey} libraries={MAP_LIBRARIES}>
      <Map
        defaultCenter={MAP_DEFAULT_CENTER}
        defaultZoom={MAP_DEFAULT_ZOOM}
        gestureHandling="greedy"
        disableDefaultUI={true}
        mapId={MAP_ID}
        colorScheme={colorScheme}
        className="h-full w-full"
      >
        <DayLayer
          key={activeDayIdx}
          places={places}
          focusedIdx={focusedIdx}
          onMarkerClick={onMarkerClick}
        />
      </Map>
    </APIProvider>
  )
})

function MapItineraryCardImpl({
  toolResult
}: {
  toolResult: MapItineraryDetails
}) {
  const { data: settings } = useSettings()
  const { copied, handleCopy } = useClipboard()
  const { resolvedTheme } = useTheme()

  const [activeDayIdx, setActiveDayIdx] = useState(0)
  // Default to the first place of the first day so the detail card is
  // visible from initial render — matches the reference design.
  const [focusedPlaceIdx, setFocusedPlaceIdx] = useState<number | null>(0)

  const activeDay = toolResult.days[activeDayIdx] ?? toolResult.days[0]

  const onSelectDay = useCallback((idx: number) => {
    setActiveDayIdx(idx)
    // Reset to the first place of the new day (not null) so the detail
    // card stays open as the user tabs through days.
    setFocusedPlaceIdx(0)
  }, [])

  const onPrev = useCallback(() => {
    if (!activeDay) return
    setFocusedPlaceIdx((prev) => {
      const total = activeDay.places.length
      if (total === 0) return null
      const current = prev ?? 0
      return (current - 1 + total) % total
    })
  }, [activeDay])

  const onNext = useCallback(() => {
    if (!activeDay) return
    setFocusedPlaceIdx((prev) => {
      const total = activeDay.places.length
      if (total === 0) return null
      const current = prev ?? -1
      return (current + 1) % total
    })
  }, [activeDay])

  // Esc dismisses the detail card.
  useEffect(() => {
    if (focusedPlaceIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedPlaceIdx(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusedPlaceIdx])

  const onCopy = useCallback(() => {
    if (!activeDay) return
    handleCopy(buildDayMarkdown(activeDay))
  }, [activeDay, handleCopy])

  const onMarkerClick = useCallback((i: number) => setFocusedPlaceIdx(i), [])

  const gmapsUrl = useMemo(
    () => (activeDay ? buildGoogleMapsUrl(activeDay) : null),
    [activeDay]
  )

  const apiKey = settings?.googleCloud?.googleApiKey
  const colorScheme = resolvedTheme === 'dark' ? 'DARK' : 'LIGHT'

  if (!apiKey) {
    return (
      <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border p-4 text-sm">
        Add a Google API Key in Settings → Google Cloud to render the trip map.
      </div>
    )
  }

  if (!activeDay) return null

  const focusedPlace =
    focusedPlaceIdx != null ? activeDay.places[focusedPlaceIdx] : null
  const copyMarkdown = buildDayMarkdown(activeDay)

  return (
    <div className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm">
      <div className="relative h-120 w-full">
        <MapSurface
          apiKey={apiKey}
          colorScheme={colorScheme}
          activeDayIdx={activeDayIdx}
          places={activeDay.places}
          focusedIdx={focusedPlaceIdx}
          onMarkerClick={onMarkerClick}
        />

        {/* Floating tab strip — only rendered for >1 day. */}
        {toolResult.days.length > 1 && (
          <div
            role="tablist"
            aria-label="Itinerary days"
            className="bg-background/85 absolute top-3 left-3 z-10 flex gap-1 overflow-x-auto rounded-full p-1 shadow-md backdrop-blur"
          >
            {toolResult.days.map((day, i) => {
              const active = i === activeDayIdx
              return (
                <button
                  key={day.label}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => onSelectDay(i)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Per-day actions — only when no detail card is open. */}
        {!focusedPlace && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {gmapsUrl && (
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open route in Google Maps"
                className="bg-background/85 text-foreground hover:bg-background flex size-8 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
              >
                <ExternalLinkIcon size={14} />
              </a>
            )}
            <button
              type="button"
              onClick={onCopy}
              title="Copy day as markdown"
              className="bg-background/85 text-foreground hover:bg-background flex size-8 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
            >
              {copied === copyMarkdown ? (
                <CheckIcon size={14} />
              ) : (
                <CopyIcon size={14} />
              )}
            </button>
          </div>
        )}

        {focusedPlace && focusedPlaceIdx != null && (
          <PlaceDetail
            place={focusedPlace}
            dayLabel={activeDay.label}
            index={focusedPlaceIdx}
            total={activeDay.places.length}
            onPrev={onPrev}
            onNext={onNext}
            onClose={() => setFocusedPlaceIdx(null)}
          />
        )}
      </div>
    </div>
  )
}

// Memoize the whole card so any parent re-renders during streaming (the
// chat surface re-renders on every token) don't reach into this subtree.
// `toolResult` is a stable reference once the tool resolves, so default
// shallow comparison is correct.
export const MapItineraryCard = memo(MapItineraryCardImpl)
