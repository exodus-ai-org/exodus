import { unlink } from 'fs/promises'
import { join } from 'path'

import type { AgentTool } from '@earendil-works/pi-agent-core'
import { Type } from '@earendil-works/pi-ai'
import { TOOL_NAMES } from '@exodus/shared/constants/tool-names'
import type { ImageGenerationDetails } from '@exodus/shared/types/chat'
import OpenAI from 'openai'
import { ImageGenerateParams } from 'openai/resources/images'

import { Settings } from '../../db/schema'
import { saveMedia, type SavedMedia } from '../../media/store'
import { getChatMediaDir, getGroupMediaDir } from '../../paths'

const imageGenerationSchema = Type.Object({
  prompt: Type.String({
    description: 'Detailed description of the image to generate.'
  })
})

/** Where the images are saved: a chat's media dir, or a Group's. */
export type ImageGenerationTarget = { chatId: string } | { groupId: string }

// A DALL·E link is fetched the moment it arrives (it expires in an hour).
const DOWNLOAD_TIMEOUT_MS = 60_000
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024

async function download(
  url: string,
  signal?: AbortSignal
): Promise<{ bytes: Buffer; contentType: string | null }> {
  if (!/^https?:\/\//iu.test(url)) throw new Error('not an http(s) URL')
  const timeout = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  const res = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error('image too large')
  return { bytes, contentType: res.headers.get('content-type') }
}

export const imageGeneration = (
  setting: Settings,
  target: ImageGenerationTarget
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
      // Either way the image is saved under ~/.exodus/media right now, and
      // `details` carries only its id: base64 in the row would add megabytes
      // to every history load, and a DALL·E link is dead in an hour.
      const dir =
        'chatId' in target
          ? getChatMediaDir(target.chatId)
          : getGroupMediaDir(target.groupId)
      const outputMime = `image/${response.output_format ?? 'png'}`
      const data = response.data ?? []
      const saved: SavedMedia[] = []
      try {
        for (const [i, img] of data.entries()) {
          try {
            const { bytes, contentType } = img.b64_json
              ? {
                  bytes: Buffer.from(img.b64_json, 'base64'),
                  contentType: outputMime
                }
              : img.url
                ? await download(img.url, signal)
                : { bytes: Buffer.alloc(0), contentType: null }
            saved.push(await saveMedia(dir, bytes, contentType))
          } catch (e) {
            throw new Error(
              `Image ${i + 1} of ${data.length} could not be saved: ${
                e instanceof Error ? e.message : String(e)
              }`,
              { cause: e }
            )
          }
        }
      } catch (e) {
        // All or nothing: a failed image fails the call, so the ones already
        // written would be referenced by no row.
        await Promise.all(
          saved.map((m) => unlink(join(dir, m.mediaId)).catch(() => {}))
        )
        throw e
      }

      const details: ImageGenerationDetails = {
        images: saved.map((media, i) => ({
          ...media,
          ...('chatId' in target ? { chatId: target.chatId } : {}),
          ...(data[i].revised_prompt
            ? { revisedPrompt: data[i].revised_prompt }
            : {})
        })),
        size: setting.image?.size ?? undefined
      }
      // The card shows the images; the model gets what it can talk about.
      // A data URL would put megabytes of base64 into the context for good.
      const forModel = {
        shownToUser: details.images.length,
        images: data.map(({ url, revised_prompt: revisedPrompt }) => ({
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
