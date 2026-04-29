import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import type { ItineraryPlace } from './place-item'

type DayLayerProps = {
  places: ItineraryPlace[]
  focusedIdx: number | null
  onMarkerClick: (idx: number) => void
}

/**
 * Renders the active day's pins + polyline and fits the map to its bounds
 * whenever the place set changes (i.e. tab switch). When a single place is
 * focused, recenters on it without zooming. Lives inside <Map> because it
 * needs the map instance from useMap().
 */
export function DayLayer({ places, focusedIdx, onMarkerClick }: DayLayerProps) {
  const map = useMap()
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  // Fit bounds to the active day's places. Runs on tab switch (places change),
  // not on hover/focus — that case uses panTo via the focusedIdx effect below.
  useEffect(() => {
    if (!map || places.length === 0) return
    if (places.length === 1) {
      map.setCenter({ lat: places[0].lat, lng: places[0].lng })
      map.setZoom(15)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const p of places) bounds.extend({ lat: p.lat, lng: p.lng })
    map.fitBounds(bounds, 48 /* px padding so pins don't kiss the edge */)
  }, [map, places])

  // Pan to the hovered/focused place WITHOUT changing zoom — keeps the
  // overall day in view while highlighting the selected stop.
  useEffect(() => {
    if (!map || focusedIdx == null) return
    const p = places[focusedIdx]
    if (!p) return
    map.panTo({ lat: p.lat, lng: p.lng })
  }, [map, focusedIdx, places])

  // Render a polyline through the places. We use the raw maps.Polyline API
  // (not <Polyline>) to keep it imperative — this layer remounts on tab
  // change and we want a clean tear-down.
  useEffect(() => {
    if (!map) return
    const path = places.map((p) => ({ lat: p.lat, lng: p.lng }))
    const line = new google.maps.Polyline({
      path,
      strokeColor: '#4285F4',
      strokeOpacity: 0.85,
      strokeWeight: 4,
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
      {places.map((p, i) => {
        const focused = focusedIdx === i
        return (
          <AdvancedMarker
            key={`${p.lat}-${p.lng}-${i}`}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => onMarkerClick(i)}
            zIndex={focused ? 100 : 10}
          >
            <div
              className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-md transition-transform',
                focused
                  ? 'bg-primary text-primary-foreground border-background scale-110'
                  : 'bg-background text-foreground border-foreground/80 hover:scale-105'
              )}
            >
              {i + 1}
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}
