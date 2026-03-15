import { v1 } from '@googlemaps/places'
import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapsPlaces = (setting: Setting) =>
  tool({
    description:
      'Search for places by text query using Google Maps. Returns name, address, rating, and location for each result.',
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'The text query to search for a place, e.g. "Spicy Vegetarian Food in Sydney, Australia" or "Fine seafood dining near Palo Alto, CA".'
        )
    }),
    execute: async ({ query }) => {
      if (!setting.googleCloud?.googleApiKey) {
        throw new Error(
          'To use Google Maps Places, make sure to fill in the `googleApiKey` in the setting.'
        )
      }
      try {
        const placesClient = new v1.PlacesClient({
          apiKey: setting.googleCloud.googleApiKey
        })
        const response = await placesClient.searchText(
          { textQuery: query },
          {
            otherArgs: {
              headers: { 'X-Goog-FieldMask': 'places' }
            }
          }
        )
        return response
      } catch (e) {
        throw new Error(
          e instanceof Error ? e.message : 'Failed to retrieve places data'
        )
      }
    }
  })
