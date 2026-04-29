import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'

/**
 * `mapItinerary` is the single map-rendering tool: lookups, A→B routes, and
 * full multi-day itineraries all collapse into one interactive card with
 * tabs (when there's >1 day), a shared map instance, and a clickable place
 * list. The legacy `googleMapsPlaces` / `googleMapsRouting` tools were
 * removed in favor of this — one Google Map per answer regardless of stop
 * count, and the LLM only has to learn one tool's schema.
 *
 * Server-side this tool does no Google API calls — the LLM produces the
 * itinerary structure from web search results or its own knowledge. We
 * validate the shape, normalize routeMode, and pass through; all rendering
 * happens in MapItineraryCard.
 */
const placeSchema = Type.Object({
  name: Type.String({
    description:
      'Place name as the user would recognize it (e.g. "Café Central", "Musikverein 金色大厅"). Mixed languages are fine.'
  }),
  lat: Type.Number({ description: 'Latitude in decimal degrees.' }),
  lng: Type.Number({ description: 'Longitude in decimal degrees.' }),
  photoUrl: Type.Optional(
    Type.String({
      description:
        'Optional thumbnail URL. Use a public/CDN-hosted image if you have one from a prior web search; omit otherwise — DO NOT fabricate URLs.'
    })
  ),
  rating: Type.Optional(
    Type.Number({
      description: 'Optional star rating, 0-5. Omit if unknown.'
    })
  ),
  reviewCount: Type.Optional(
    Type.Number({
      description: 'Optional review count integer. Omit if unknown.'
    })
  ),
  type: Type.Optional(
    Type.String({
      description:
        'Short category label like "Museum", "Café", "Park", "Concert Hall". Single-word noun preferred.'
    })
  ),
  timeLabel: Type.Optional(
    Type.String({
      description:
        'Optional human-readable time of visit, e.g. "10:00 AM", "Lunch", "After dinner". Free-form.'
    })
  ),
  note: Type.Optional(
    Type.String({
      description:
        'One- or two-sentence rationale specific to this stop (why visit, what to do there). Avoid generic descriptions.'
    })
  )
})

const daySchema = Type.Object({
  label: Type.String({
    description:
      'Short tab label, 6 chars or fewer recommended. Examples: "Day 1", "周一", "Morning". This is what shows in the tab strip.'
  }),
  title: Type.Optional(
    Type.String({
      description:
        'Headline for this day in the side panel — e.g. "Inner-city composer trail + Musikverein". Keep under ~40 chars.'
    })
  ),
  summary: Type.Optional(
    Type.String({
      description:
        'One- or two-sentence overview of the day. Renders below the title in the side panel.'
    })
  ),
  // Accept any string here so the LLM can emit "WALK"/"DRIVE"/"walking"/etc.
  // without tripping schema validation; normalize in execute(). The original
  // strict literal union failed against the routing tool's enum-like
  // "WALK"/"DRIVE" the model picked up by analogy.
  routeMode: Type.Optional(
    Type.String({
      description:
        'Travel mode used to draw the route line and to deep-link Google Maps. Accepts (case-insensitive): "walking" (default), "driving", "transit". WALK/DRIVE/TRANSIT also accepted as aliases.'
    })
  ),
  places: Type.Array(placeSchema, {
    description:
      'Stops in visit order. The route line connects them in sequence; the first place is start, last is end.'
  })
})

const mapItinerarySchema = Type.Object({
  title: Type.Optional(
    Type.String({
      description:
        'Optional overall trip title shown above the tabs (e.g. "维也纳 3 日音乐之旅"). Omit for single-day plans.'
    })
  ),
  days: Type.Array(daySchema, {
    description:
      'One or more days. Use a single day with a single place for a lookup, a single day with two places for a route, or one day per day for a multi-day plan.'
  })
})

export type MapItineraryDetails = {
  type: 'mapItinerary'
  title?: string
  days: Array<{
    label: string
    title?: string
    summary?: string
    routeMode?: 'walking' | 'driving' | 'transit'
    places: Array<{
      name: string
      lat: number
      lng: number
      photoUrl?: string
      rating?: number
      reviewCount?: number
      type?: string
      timeLabel?: string
      note?: string
    }>
  }>
}

function normalizeRouteMode(
  value: string | undefined
): 'walking' | 'driving' | 'transit' | undefined {
  if (!value) return undefined
  const lower = value.toLowerCase()
  if (lower === 'walking' || lower === 'walk') return 'walking'
  if (lower === 'driving' || lower === 'drive') return 'driving'
  if (lower === 'transit') return 'transit'
  // Unknown mode: drop it instead of throwing — the renderer falls back to
  // 'walking' which is a safe default for itineraries.
  return undefined
}

export const mapItinerary: AgentTool<typeof mapItinerarySchema> = {
  name: 'mapItinerary',
  label: 'Map Itinerary',
  description:
    'Build a trip plan or any map-based answer as a single interactive card with tabs (one tab per day or section), a shared map instance, and a clickable place list. ' +
    'USE WHEN: any answer that benefits from showing places on a map — single-stop lookups, A→B routes, day-by-day itineraries, sightseeing tours, multi-city trips. ' +
    'For a single place lookup, pass one day with one place. For a route, pass one day with two places (origin → destination). For a multi-day plan, pass one day per day. ' +
    'You provide all places with lat/lng you have already determined (from web search results or your own knowledge — do not fabricate coordinates). ' +
    'The card always renders one map regardless of place/day count, with a tabbed interface when there is more than one day.',
  parameters: mapItinerarySchema,
  execute: async (_toolCallId, payload) => {
    // Normalize routeMode case so "WALK"/"DRIVE" emitted by the model still
    // produce a usable mode in the renderer.
    const days = payload.days.map((d) => ({
      ...d,
      routeMode: normalizeRouteMode(d.routeMode as string | undefined) as
        | 'walking'
        | 'driving'
        | 'transit'
        | undefined
    }))
    const details: MapItineraryDetails = {
      type: 'mapItinerary',
      title: payload.title,
      days
    }
    return {
      content: [
        {
          type: 'text' as const,
          // Compact text representation for downstream LLM context — the
          // visual card carries the actual rendering.
          text:
            (payload.title ? `${payload.title}\n` : '') +
            days
              .map(
                (d) =>
                  `${d.label}${d.title ? `: ${d.title}` : ''} (${d.places.length} stop${d.places.length === 1 ? '' : 's'})`
              )
              .join('\n')
        }
      ],
      details
    }
  }
}
