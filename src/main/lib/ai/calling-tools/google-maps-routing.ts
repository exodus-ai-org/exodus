import { protos, v2 } from '@googlemaps/routing'
import { Settings } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapsRouting = (settings: Settings) =>
  tool({
    description: 'Compute routes from location A to location B.',
    parameters: z.object({
      origin: z.string(),
      destination: z.string(),
      travelMode: z
        .nativeEnum(protos.google.maps.routing.v2.RouteTravelMode)
        .nullable()
        .describe(
          'A travel mode can be specified by the user. ' +
            'The acceptable values are: TRAVEL_MODE_UNSPECIFIED = 0, DRIVE = 1, BICYCLE = 2, WALK = 3, TWO_WHEELER = 4, and TRANSIT = 7. ' +
            'If the user does not indicate a travel mode, request their input.'
        )
    }),
    execute: async ({
      origin,
      destination,
      travelMode
    }: {
      origin: string
      destination: string
      travelMode: protos.google.maps.routing.v2.RouteTravelMode | null
    }) => {
      if (!settings.googleCloud?.googleApiKey) {
        throw new Error(
          'To use Google Map Places, make sure to fill in the `googleApiKey` in the settings.'
        )
      }

      try {
        const routingClient = new v2.RoutesClient({
          apiKey: settings.googleCloud.googleApiKey
        })

        const response = await routingClient.computeRoutes(
          {
            origin: {
              address: origin
            },
            destination: {
              address: destination
            },
            travelMode:
              travelMode ??
              protos.google.maps.routing.v2.RouteTravelMode
                .TRAVEL_MODE_UNSPECIFIED,
            routingPreference:
              travelMode ===
                protos.google.maps.routing.v2.RouteTravelMode.WALK ||
              travelMode ===
                protos.google.maps.routing.v2.RouteTravelMode.BICYCLE
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
        throw e instanceof Error ? e.message : 'Failed to retrieve routing data'
      }
    }
  })
