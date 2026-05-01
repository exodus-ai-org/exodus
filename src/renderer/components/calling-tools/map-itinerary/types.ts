/** Shared place + day shapes for the map-itinerary card.
 *  Mirrors the server-side schema in
 *  `src/main/lib/ai/calling-tools/map-itinerary.ts` — keep them in sync. */
export type ItineraryReview = {
  author?: string
  authorPhotoUrl?: string
  rating?: number
  text?: string
  relativeTime?: string
}

export type ItineraryPlace = {
  // LLM-provided
  name: string
  lat: number
  lng: number
  type?: string
  timeLabel?: string
  note?: string
  // Places-API-enriched (any may be absent if enrichment failed)
  rating?: number
  reviewCount?: number
  phone?: string
  websiteUri?: string
  googleMapsUri?: string
  address?: string
  openNow?: boolean
  openingHours?: string[]
  /** Photo reference paths from Places API. The renderer constructs full
   *  URLs by prepending GOOGLE_PLACES_API_BASE and appending the user's
   *  Google API key (via useSettings). */
  photoNames?: string[]
  reviews?: ItineraryReview[]
}

export type ItineraryDay = {
  label: string
  title?: string
  summary?: string
  routeMode?: 'walking' | 'driving' | 'transit'
  places: ItineraryPlace[]
}

export type MapItineraryDetails = {
  type: 'mapItinerary'
  title?: string
  days: ItineraryDay[]
}

/** Build a Places API photo URL from a photo reference path. The user's
 *  API key is appended client-side so the server response stays
 *  cache-friendly and key-free. Returns `null` if either input missing. */
export function buildPlacePhotoUrl(
  photoName: string | undefined,
  apiKey: string | undefined,
  maxWidthPx = 800
): string | null {
  if (!photoName || !apiKey) return null
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`
}
