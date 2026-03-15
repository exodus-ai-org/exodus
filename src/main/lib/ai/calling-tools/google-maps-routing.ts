import { protos, v2 } from '@googlemaps/routing'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapsRouting = (setting: Setting) =>
  tool({
    description: 'Compute a route between two locations using Google Maps.',
    inputSchema: z.object({
      origin: z.string().describe('Starting address or place name.'),
      destination: z.string().describe('Destination address or place name.'),
      travelMode: z
        .number()
        .nullable()
        .describe(
          'Travel mode: TRAVEL_MODE_UNSPECIFIED = 0, DRIVE = 1, BICYCLE = 2, WALK = 3, TWO_WHEELER = 4, TRANSIT = 7. Default 0 if unspecified.'
        )
        .default(0)
    }),
    execute: async ({ origin, destination, travelMode }) => {
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
        return response
      } catch (e) {
        throw new Error(
          e instanceof Error ? e.message : 'Failed to retrieve routing data'
        )
      }
    }
  })
