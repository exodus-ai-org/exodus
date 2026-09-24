import type { Settings } from '@main/lib/db/schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

const generate = vi.fn()
vi.mock('openai', () => ({
  default: class {
    images = { generate }
  }
}))

const { imageGeneration } =
  await import('@main/lib/ai/calling-tools/image-generation')

const settings = {
  providers: { openaiApiKey: 'sk-test' },
  image: { model: 'gpt-image-2', size: '1024x1536' }
} as unknown as Settings

afterEach(() => generate.mockReset())

function textOf(out: { content: Array<{ type: string; text?: string }> }) {
  const block = out.content[0]
  return block?.type === 'text' ? (block.text ?? '') : ''
}

describe('image_generation', () => {
  it('turns a base64 result into a data URL the card can show, and keeps the bytes out of the model text', async () => {
    generate.mockResolvedValue({
      output_format: 'webp',
      data: [{ b64_json: 'QUJD', revised_prompt: 'a red fox, watercolour' }]
    })
    const out = await imageGeneration(settings).execute('c1', {
      prompt: 'a fox'
    })

    expect(out.details).toEqual({
      images: [
        {
          url: 'data:image/webp;base64,QUJD',
          revisedPrompt: 'a red fox, watercolour'
        }
      ],
      size: '1024x1536'
    })
    const text = textOf(out)
    expect(text).not.toContain('QUJD')
    expect(JSON.parse(text)).toEqual({
      shownToUser: 1,
      images: [{ revisedPrompt: 'a red fox, watercolour' }]
    })
  })

  it('passes an https URL through to both the card and the model', async () => {
    generate.mockResolvedValue({
      data: [{ url: 'https://img.example/1.png' }]
    })
    const out = await imageGeneration(settings).execute('c1', {
      prompt: 'a fox'
    })

    expect(out.details.images[0].url).toBe('https://img.example/1.png')
    expect(JSON.parse(textOf(out)).images).toEqual([
      { url: 'https://img.example/1.png' }
    ])
  })

  it('defaults the mime type to png when the response does not say', async () => {
    generate.mockResolvedValue({ data: [{ b64_json: 'QUJD' }] })
    const out = await imageGeneration(settings).execute('c1', {
      prompt: 'a fox'
    })
    expect(out.details.images[0].url).toBe('data:image/png;base64,QUJD')
  })
})
