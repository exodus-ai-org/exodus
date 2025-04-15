import { tool } from 'ai'
import { z } from 'zod'

export const weather = tool({
  description: 'Display the weather in a given location to the user.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    try {
      const response = await fetch(`https://wttr.in/${location}`)
      const htmlString = await response.text()
      return htmlString.match(/<pre>(.*?)<\/pre>/s)?.[0]
    } catch {
      return ''
    }
  }
})
