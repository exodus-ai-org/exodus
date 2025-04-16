import { v2 } from '@googlemaps/routing'
import { google } from '@googlemaps/routing/build/protos/protos'
import { tool } from 'ai'
import { z } from 'zod'

export const googleMapRouting = tool({
  description: 'Compute routes from address A to address B.',
  parameters: z.object({ origin: z.string(), destination: z.string() }),
  execute: async ({
    origin,
    destination
  }: {
    origin: string
    destination: string
  }) => {
    try {
      const routingClient = new v2.RoutesClient()
      const request: google.maps.routing.v2.IComputeRoutesRequest = {
        origin: {
          address: origin
        },
        destination: {
          address: destination
        }
      }

      const response = await routingClient.computeRoutes(request)
      return JSON.stringify(response)
    } catch {
      return ''
    }
  }
})
