import { v2 } from '@googlemaps/routing'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapRouting = (setting: Setting) =>
  tool({
    description: 'Compute routes from address A to address B.',
    parameters: z.object({ origin: z.string(), destination: z.string() }),
    execute: async ({
      origin,
      destination
    }: {
      origin: string
      destination: string
    }) => {
      if (!setting.googleApiKey) {
        throw new Error(
          'To use Google Map Places, make sure to fill in the `googleApiKey` in the settings.'
        )
      }

      try {
        const routingClient = new v2.RoutesClient({
          apiKey: setting.googleApiKey
        })

        const response = await routingClient.computeRoutes(
          {
            origin: {
              address: origin
            },
            destination: {
              address: destination
            }
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

        return JSON.stringify(response)
      } catch (e) {
        return e instanceof Error
          ? e.message
          : 'Failed to retrieve routing message.'
      }
    }
  })
