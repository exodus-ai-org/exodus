import { v1 } from '@googlemaps/places'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapsPlaces = (setting: Setting) =>
  tool({
    description:
      'Display detailed location data based on the location provided by the user.',
    parameters: z.object({ address: z.string() }),
    execute: async ({ address }: { address: string }) => {
      if (!setting.googleApiKey) {
        throw new Error(
          'To use Google Map Places, make sure to fill in the `googleApiKey` in the settings.'
        )
      }

      try {
        const placesClient = new v1.PlacesClient({
          apiKey: setting.googleApiKey
        })

        const response = await placesClient.searchText(
          {
            textQuery: address
          },
          {
            otherArgs: {
              headers: {
                'X-Goog-FieldMask': 'places.displayName'
              }
            }
          }
        )
        return JSON.stringify(response)
      } catch {
        return ''
      }
    }
  })
