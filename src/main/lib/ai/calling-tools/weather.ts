import { tool } from 'ai'
import { z } from 'zod'

export const weather = tool({
  description: 'Display the weather in a given location to the user.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    try {
      const response = await fetch(`https://wttr.in/${location}?format=j1`)
      const data = await response.json()
      return JSON.stringify(data)
    } catch (e) {
      return e instanceof Error ? e.message : 'Failed to retrieve weather data'
    }
  }
})
