import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { CheckIcon, CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { useClipboard } from '@/hooks/use-clipboard'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import { DayLayer } from './day-layer'
import { type ItineraryPlace, PlaceItem } from './place-item'

type ItineraryDay = {
  label: string
  title?: string
  summary?: string
  routeMode?: 'walking' | 'driving' | 'transit'
  places: ItineraryPlace[]
}

type MapItineraryDetails = {
  type: 'mapItinerary'
  title?: string
  days: ItineraryDay[]
}

const MODE_TO_GMAPS_PARAM: Record<
  NonNullable<ItineraryDay['routeMode']>,
  string
> = {
  walking: 'walking',
  driving: 'driving',
  transit: 'transit'
}

/** Build a Google Maps deep-link that opens the day's route with all
 *  waypoints in order. Single-place days drop into search mode instead of
 *  routing mode (a route to yourself isn't useful). */
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
      lines.push(
        `   https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
      )
      return lines.join('\n')
    })
    .join('\n\n')
  return `${header}${summary}\n${places}`
}

export function MapItineraryCard({
  toolResult
}: {
  toolResult: MapItineraryDetails
}) {
  const { data: settings } = useSettings()
  const { copied, handleCopy } = useClipboard()

  const [activeDayIdx, setActiveDayIdx] = useState(0)
  const [focusedPlaceIdx, setFocusedPlaceIdx] = useState<number | null>(null)

  const activeDay = toolResult.days[activeDayIdx] ?? toolResult.days[0]

  const onSelectDay = useCallback((idx: number) => {
    setActiveDayIdx(idx)
    setFocusedPlaceIdx(null)
  }, [])

  const onCopy = useCallback(() => {
    if (!activeDay) return
    handleCopy(buildDayMarkdown(activeDay))
  }, [activeDay, activeDayIdx, handleCopy])

  const gmapsUrl = useMemo(
    () => (activeDay ? buildGoogleMapsUrl(activeDay) : null),
    [activeDay]
  )

  const apiKey = settings?.googleCloud?.googleApiKey

  if (!apiKey) {
    return (
      <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border p-4 text-sm">
        Add a Google API Key in Settings → Google Cloud to render the trip map.
      </div>
    )
  }

  if (!activeDay) return null

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
      {toolResult.title && (
        <div className="border-border border-b px-4 py-2.5">
          <h3 className="text-foreground text-sm font-semibold">
            {toolResult.title}
          </h3>
        </div>
      )}

      {/* Tab strip — only shown when there's more than one day */}
      {toolResult.days.length > 1 && (
        <div
          role="tablist"
          aria-label="Itinerary days"
          className="border-border bg-muted/40 flex gap-1 overflow-x-auto border-b px-2 py-1.5"
        >
          {toolResult.days.map((day, i) => {
            const active = i === activeDayIdx
            return (
              <button
                key={i}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => onSelectDay(i)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Body — map left, side panel right. h-[420px] gives the map enough
          room without dwarfing the surrounding chat. */}
      <div className="flex h-[420px] flex-col md:flex-row">
        <div className="relative min-h-[240px] flex-1">
          <APIProvider apiKey={apiKey} libraries={['geometry']}>
            <Map
              defaultCenter={{ lat: 0, lng: 0 }}
              defaultZoom={2}
              gestureHandling="greedy"
              disableDefaultUI={true}
              mapId="exodus-itinerary"
              className="h-full w-full"
            >
              <DayLayer
                key={activeDayIdx}
                places={activeDay.places}
                focusedIdx={focusedPlaceIdx}
                onMarkerClick={(i) => setFocusedPlaceIdx(i)}
              />
            </Map>
          </APIProvider>
        </div>

        <div className="border-border bg-card flex w-full shrink-0 flex-col border-t md:w-80 md:border-t-0 md:border-l">
          <div className="border-border space-y-2 border-b px-4 py-3">
            <div className="text-muted-foreground text-[10px] tracking-widest uppercase">
              {activeDay.label}
            </div>
            {activeDay.title && (
              <div className="text-foreground text-base leading-snug font-semibold">
                {activeDay.title}
              </div>
            )}
            {activeDay.summary && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {activeDay.summary}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                >
                  <ExternalLinkIcon size={12} />
                  Open in Google Maps
                </a>
              )}
              <button
                type="button"
                onClick={onCopy}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors"
              >
                {copied === buildDayMarkdown(activeDay) ? (
                  <>
                    <CheckIcon size={12} />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {activeDay.places.map((place, i) => (
              <PlaceItem
                key={`${place.lat}-${place.lng}-${i}`}
                place={place}
                index={i}
                isFocused={focusedPlaceIdx === i}
                onHover={() => setFocusedPlaceIdx(i)}
                onLeave={() => setFocusedPlaceIdx(null)}
                onClick={() => setFocusedPlaceIdx(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
