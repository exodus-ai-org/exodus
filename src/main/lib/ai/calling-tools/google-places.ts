import { v1 } from '@googlemaps/places'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapPlaces = tool({
  description: 'Get location data from an address.',
  parameters: z.object({ address: z.string() }),
  execute: async ({ address }: { address: string }) => {
    try {
      const placesClient = new v1.PlacesClient()
      const request = {
        textQuery: address
      }

      const response = await placesClient.searchText(request, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': 'places.displayName'
          }
        }
      })
      return JSON.stringify(response)
    } catch {
      return ''
    }
  }
})
