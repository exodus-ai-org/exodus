import { protos, v2 } from '@googlemaps/routing'
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Settings } from '@shared/types/db'

import { logger } from '../../logger'

const GRPC_STATUS = {
  INVALID_ARGUMENT: 3,
  NOT_FOUND: 5,
  PERMISSION_DENIED: 7,
  RESOURCE_EXHAUSTED: 8,
  INTERNAL: 13,
  UNAVAILABLE: 14
} as const

const RETRYABLE_CODES = new Set([
  GRPC_STATUS.RESOURCE_EXHAUSTED,
  GRPC_STATUS.INTERNAL,
  GRPC_STATUS.UNAVAILABLE
])

function toUserMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Failed to retrieve routing data'

  const code = (error as { code?: number }).code
  const msg = error.message.toLowerCase()

  if (code === GRPC_STATUS.NOT_FOUND || msg.includes('not_found')) {
    return (
      'One or more locations could not be found. ' +
      'Use a full address (street, city, country) and set regionCode if the country is ambiguous.'
    )
  }
  if (
    code === GRPC_STATUS.PERMISSION_DENIED ||
    msg.includes('api key') ||
    msg.includes('permission_denied') ||
    msg.includes('request_denied')
  ) {
    return (
      'Google Maps API request was denied. ' +
      'Verify your API key is valid and the Routes API is enabled in Google Cloud Console.'
    )
  }
  if (
    code === GRPC_STATUS.RESOURCE_EXHAUSTED ||
    msg.includes('quota') ||
    msg.includes('over_query_limit') ||
    msg.includes('over_daily_limit')
  ) {
    return (
      'Google Maps API quota exceeded. ' +
      'Wait a moment and try again, or check your billing account in Google Cloud Console.'
    )
  }
  if (
    code === GRPC_STATUS.INVALID_ARGUMENT ||
    msg.includes('invalid_request') ||
    msg.includes('invalid argument')
  ) {
    return (
      'Invalid routing request. ' +
      'Check that both origin and destination are valid addresses.'
    )
  }

  return error.message || 'Failed to retrieve routing data'
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const code = (err as { code?: number }).code
      if (code == null || !RETRYABLE_CODES.has(code as 8 | 13 | 14)) throw err
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500))
      }
    }
  }
  throw lastError
}

const googleMapsRoutingSchema = Type.Object({
  origin: Type.String({
    description:
      'Full origin address including street, city, and country/state for best accuracy. ' +
      'Vague names (e.g. "the park") will fail — always include enough context. ' +
      'Examples: "1600 Amphitheatre Pkwy, Mountain View, CA, USA", "Akihabara Station, Chiyoda, Tokyo, Japan"'
  }),
  destination: Type.String({
    description:
      'Full destination address including street, city, and country/state for best accuracy. ' +
      'Vague names (e.g. "the park") will fail — always include enough context. ' +
      'Examples: "350 Fifth Avenue, New York, NY, USA", "Tokyo Disneyland, Maihama, Urayasu, Chiba, Japan"'
  }),
  travelMode: Type.Optional(
    Type.Number({
      description:
        'Travel mode: DRIVE = 1, BICYCLE = 2, WALK = 3, TWO_WHEELER = 4. Defaults to DRIVE. ' +
        'Do NOT use TRANSIT (7) — it is not supported.'
    })
  ),
  regionCode: Type.Optional(
    Type.String({
      description:
        'Two-letter ccTLD region code to disambiguate addresses that could match multiple countries. ' +
        'Examples: "US", "JP", "CN", "GB", "DE"'
    })
  )
})

export const googleMapsRouting = (
  setting: Settings
): AgentTool<typeof googleMapsRoutingSchema> => ({
  name: 'googleMapsRouting',
  label: 'Google Maps Routing',
  description:
    'Generate a driving, walking, or cycling route between two locations. ' +
    'Transit/public transport is NOT supported — answer transit questions from your own knowledge. ' +
    'Always provide full addresses (street, city, country) for best accuracy.',
  parameters: googleMapsRoutingSchema,
  execute: async (
    _toolCallId,
    { origin, destination, travelMode, regionCode }
  ) => {
    if (!setting.googleCloud?.googleApiKey) {
      throw new Error(
        'Google Maps Routing requires a Google API Key. Please add it in Settings → Google Cloud.'
      )
    }

    const apiKey = setting.googleCloud.googleApiKey
    // Clamp to supported modes; any unsupported value (e.g. TRANSIT=7) falls back to DRIVE
    const SUPPORTED = new Set([1, 2, 3, 4])
    const mode = SUPPORTED.has(travelMode ?? 0)
      ? (travelMode as number)
      : protos.google.maps.routing.v2.RouteTravelMode.DRIVE

    try {
      const routingClient = new v2.RoutesClient({ apiKey })

      const response = await withRetry(() =>
        routingClient.computeRoutes(
          {
            origin: { address: origin },
            destination: { address: destination },
            travelMode: mode,
            regionCode: regionCode ?? undefined,
            routingPreference:
              mode === protos.google.maps.routing.v2.RouteTravelMode.DRIVE ||
              mode === protos.google.maps.routing.v2.RouteTravelMode.TWO_WHEELER
                ? protos.google.maps.routing.v2.RoutingPreference
                    .TRAFFIC_AWARE_OPTIMAL
                : undefined,
            computeAlternativeRoutes: false,
            polylineQuality: 'HIGH_QUALITY'
          },
          {
            otherArgs: {
              headers: {
                'X-Goog-FieldMask':
                  'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs,routes.warnings'
              }
            }
          }
        )
      )

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response) }],
        details: response
      }
    } catch (e) {
      logger.error('tools', 'Google Maps routing failed', { error: String(e) })
      throw new Error(toUserMessage(e))
    }
  }
})
