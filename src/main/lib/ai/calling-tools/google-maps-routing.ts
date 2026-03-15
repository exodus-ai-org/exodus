import { protos, v2 } from '@googlemaps/routing'
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

const googleMapsRoutingSchema = Type.Object({
  origin: Type.String({ description: 'Starting address or place name.' }),
  destination: Type.String({
    description: 'Destination address or place name.'
  }),
  travelMode: Type.Optional(
    Type.Number({
      description:
        'Travel mode: TRAVEL_MODE_UNSPECIFIED = 0, DRIVE = 1, BICYCLE = 2, WALK = 3, TWO_WHEELER = 4, TRANSIT = 7. Default 0 if unspecified.'
    })
  )
})

export const googleMapsRouting = (
  setting: Setting
): AgentTool<typeof googleMapsRoutingSchema> => ({
  name: 'googleMapsRouting',
  label: 'Google Maps Routing',
  description: 'Compute a route between two locations using Google Maps.',
  parameters: googleMapsRoutingSchema,
  execute: async (_toolCallId, { origin, destination, travelMode }) => {
    if (!setting.googleCloud?.googleApiKey) {
      throw new Error(
        'To use Google Maps Routing, make sure to fill in the `googleApiKey` in the setting.'
      )
    }
    try {
      const routingClient = new v2.RoutesClient({
        apiKey: setting.googleCloud.googleApiKey
      })
      const mode =
        travelMode ??
        protos.google.maps.routing.v2.RouteTravelMode.TRAVEL_MODE_UNSPECIFIED
      const isNonMotorized =
        mode === protos.google.maps.routing.v2.RouteTravelMode.WALK ||
        mode === protos.google.maps.routing.v2.RouteTravelMode.BICYCLE
      const response = await routingClient.computeRoutes(
        {
          origin: { address: origin },
          destination: { address: destination },
          travelMode: mode,
          routingPreference: isNonMotorized
            ? null
            : protos.google.maps.routing.v2.RoutingPreference
                .TRAFFIC_AWARE_OPTIMAL,
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
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response) }],
        details: response
      }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to retrieve routing data'
      )
    }
  }
})
