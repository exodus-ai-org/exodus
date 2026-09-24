import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type } from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type { ImageGenerationDetails } from '@exodus/shared/types/chat'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'

import { Settings } from '../../db/schema'

const imageGenerationSchema = Type.Object({
  prompt: Type.String({
    description: 'Detailed description of the image to generate.'
  })
})

export const imageGeneration = (
  setting: Settings
): AgentTool<typeof imageGenerationSchema> => ({
  name: TOOL_NAMES.imageGeneration,
  label: 'Image Generation',
  description: 'Generate one or more images from a text prompt.',
  parameters: imageGenerationSchema,
  execute: async (_toolCallId, { prompt }, signal) => {
    if (signal?.aborted) throw new Error('Aborted')
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
      const response = await openai.images.generate(
        {
          model: setting.image?.model ?? 'gpt-image-2',
          prompt,
          n: setting.image?.generatedCounts ?? 1,
          size: setting.image?.size as ImageGenerateParams['size'],
          quality: setting.image?.quality as ImageGenerateParams['quality'],
          background:
            (setting.image?.background as ImageGenerateParams['background']) ??
            undefined
        },
        { signal }
      )
      // GPT image models only answer in base64; DALL·E answers with a URL.
      const mime = `image/${response.output_format ?? 'png'}`
      const details: ImageGenerationDetails = {
        images: (response.data ?? []).map((img) => ({
          url:
            img.url ??
            (img.b64_json ? `data:${mime};base64,${img.b64_json}` : undefined),
          revisedPrompt: img.revised_prompt
        })),
        size: setting.image?.size ?? undefined
      }
      // The card shows the images; the model gets what it can talk about.
      // A data URL would put megabytes of base64 into the context for good.
      const forModel = {
        shownToUser: details.images.length,
        images: details.images.map(({ url, revisedPrompt }) => ({
          ...(url?.startsWith('http') ? { url } : {}),
          ...(revisedPrompt ? { revisedPrompt } : {})
        }))
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(forModel) }],
        details
      }
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : 'Failed to generate images',
        { cause: e }
      )
    }
  }
})
