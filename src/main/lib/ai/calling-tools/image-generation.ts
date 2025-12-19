import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'
import { z } from 'zod'

export const imageGeneration = (setting: Setting) =>
  tool({
    description: "Generate image according to user's requirement.",
    parameters: z.object({ prompt: z.string() }),
    execute: async ({ prompt }: { prompt: string }) => {
      try {
        const openai = new OpenAI({
          baseURL: setting.providers?.openaiBaseUrl,
          apiKey: setting.providers?.openaiApiKey ?? ''
        })
        const images = await openai.images.generate({
          model: setting.image?.model ?? 'gpt-image-1',
          prompt,
          n: setting.image?.generatedCounts ?? 1,
          size: setting.image?.size as ImageGenerateParams['size'],
          quality: setting.image?.quality as ImageGenerateParams['quality'],
          background:
            (setting.image?.background as ImageGenerateParams['background']) ??
            undefined
        })
        return images
      } catch (e) {
        throw e instanceof Error ? e.message : 'Failed to generate images'
      }
    }
  })
