import { v1 } from '@googlemaps/places'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapsPlaces = (setting: Setting) =>
  tool({
    description: 'Specify a text string on which to search for a place.',
    parameters: z.object({
      query: z
        .string()
        .describe(
          'The query to search for a place. ' +
            'For example: "Spicy Vegetarian Food in Sydney, Australia" or "Fine seafood dining near Palo Alto, CA". ' +
            'You can refine the search by specifying details such as price levels, current opening status, ratings, or specific place types. You can also specify to bias the results to a specific location, or restrict the search to a specific location.'
        )
    }),
    execute: async ({ query }: { query: string }) => {
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
            textQuery: query
          },
          {
            otherArgs: {
              headers: {
                'X-Goog-FieldMask': 'places'
              }
            }
          }
        )
        return JSON.stringify(response)
      } catch {
        return 'Failed to retrieve places data.'
      }
    }
  })
