import { v1 } from '@googlemaps/places'
import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'

const googleMapsPlacesSchema = Type.Object({
  query: Type.String({
    description:
      'The text query to search for a place, e.g. "Spicy Vegetarian Food in Sydney, Australia" or "Fine seafood dining near Palo Alto, CA".'
  })
})

export const googleMapsPlaces = (
  setting: Setting
): AgentTool<typeof googleMapsPlacesSchema> => ({
  name: 'googleMapsPlaces',
  label: 'Google Maps Places',
  description:
    'Search for places by text query using Google Maps. Returns name, address, rating, and location for each result.',
  parameters: googleMapsPlacesSchema,
  execute: async (_toolCallId, { query }) => {
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
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response) }],
        details: response
      }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to retrieve places data'
      )
    }
  }
})
