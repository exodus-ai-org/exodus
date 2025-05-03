import { Settings } from '@shared/types/db'
import { tool } from 'ai'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'
import { z } from 'zod'

export const imageGeneration = (settings: Settings) =>
  tool({
    description: "Generate image according to user's requirement.",
    parameters: z.object({ prompt: z.string() }),
    execute: async ({ prompt }: { prompt: string }) => {
      try {
        const openai = new OpenAI({
          baseURL: settings.providers?.openaiBaseUrl,
          apiKey: settings.providers?.openaiApiKey ?? ''
        })
        const images = await openai.images.generate({
          model: settings.image?.model ?? 'gpt-image-1',
          prompt,
          n: settings.image?.generatedCounts ?? 1,
          size: settings.image?.size as ImageGenerateParams['size'],
          quality: settings.image?.quality as ImageGenerateParams['quality'],
          background: settings.image
            ?.background as ImageGenerateParams['background']
        })
        return JSON.stringify(images)
      } catch (e) {
        throw e instanceof Error ? e.message : 'Failed to generate images'
      }
    }
  })
