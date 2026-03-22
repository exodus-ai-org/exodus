import type { AgentTool } from '@mariozechner/pi-agent-core'
import { Type } from '@mariozechner/pi-ai'
import { Setting } from '@shared/types/db'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'

const imageGenerationSchema = Type.Object({
  prompt: Type.String({
    description: 'Detailed description of the image to generate.'
  })
})

export const imageGeneration = (
  setting: Setting
): AgentTool<typeof imageGenerationSchema> => ({
  name: 'imageGeneration',
  label: 'Image Generation',
  description: 'Generate one or more images from a text prompt.',
  parameters: imageGenerationSchema,
  execute: async (_toolCallId, { prompt }) => {
    if (!setting.providers?.openaiApiKey) {
      throw new Error(
        'Image Generation requires an OpenAI API Key. Please add it in Settings → Providers.'
      )
    }
    try {
      const openai = new OpenAI({
        baseURL: setting.providers?.openaiBaseUrl,
        apiKey: setting.providers.openaiApiKey
      })
      const response = await openai.images.generate({
        model: setting.image?.model ?? 'gpt-image-1.5',
        prompt,
        n: setting.image?.generatedCounts ?? 1,
        size: setting.image?.size as ImageGenerateParams['size'],
        quality: setting.image?.quality as ImageGenerateParams['quality'],
        background:
          (setting.image?.background as ImageGenerateParams['background']) ??
          undefined
      })
      const details = {
        images: (response.data ?? []).map((img) => ({
          url: img.url,
          revisedPrompt: img.revised_prompt
        }))
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(details) }],
        details
      }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to generate images'
      )
    }
  }
})
