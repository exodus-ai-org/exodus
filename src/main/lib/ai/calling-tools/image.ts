import { Providers } from '@shared/types/ai'
import { Setting } from '@shared/types/db'
import { experimental_generateImage as generateImage, tool } from 'ai'
import { z } from 'zod'
import { providers } from '../providers'

export const image = (setting: Setting) =>
  tool({
    description: "Generate image according to user's requirement.",
    parameters: z.object({ prompt: z.string() }),
    execute: async ({ prompt }: { prompt: string }) => {
      try {
        const { provider: openai } = providers[Providers.OpenAiGpt](setting)
        const { images } = await generateImage({
          model: openai.image('dall-e-3'),
          prompt,
          n: 2,
          size: '1024x1024'
        })
        return JSON.stringify(images)
      } catch {
        return ''
      }
    }
  })
