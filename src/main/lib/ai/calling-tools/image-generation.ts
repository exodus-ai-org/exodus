import { Setting } from '@shared/types/db'
import { tool } from 'ai'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'
import { z } from 'zod'

export const imageGeneration = (setting: Setting) =>
  tool({
    description: 'Generate one or more images from a text prompt.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe('Detailed description of the image to generate.')
    }),
    execute: async ({ prompt }) => {
      if (!setting.providers?.openaiApiKey) {
        throw new Error(
          'To use Image Generation, make sure to fill in the `openaiApiKey` in the setting.'
        )
      }
      try {
        const openai = new OpenAI({
          baseURL: setting.providers?.openaiBaseUrl,
          apiKey: setting.providers.openaiApiKey
        })
        const response = await openai.images.generate({
          model: setting.image?.model ?? 'gpt-image-1',
          prompt,
          n: setting.image?.generatedCounts ?? 1,
          size: setting.image?.size as ImageGenerateParams['size'],
          quality: setting.image?.quality as ImageGenerateParams['quality'],
          background:
            (setting.image?.background as ImageGenerateParams['background']) ??
            undefined
        })
        return {
          images: (response.data ?? []).map((img) => ({
            url: img.url,
            revisedPrompt: img.revised_prompt
          }))
        }
      } catch (e) {
        throw new Error(
          e instanceof Error ? e.message : 'Failed to generate images'
        )
      }
    }
  })
