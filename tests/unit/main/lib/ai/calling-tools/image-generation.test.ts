import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import type { Settings } from '@main/lib/db/schema'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))
vi.mock('@main/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

const generate = vi.fn()
vi.mock('openai', () => ({
  default: class {
    images = { generate }
  }
}))

// A scratch data dir of this file's own: the tool writes real files.
const home = mkdtempSync(join(tmpdir(), 'exodus-imagegen-'))
const originalExodusHome = process.env.EXODUS_HOME
process.env.EXODUS_HOME = home
afterAll(() => {
  process.env.EXODUS_HOME = originalExodusHome
})

const { imageGeneration } =
  await import('@main/lib/ai/calling-tools/image-generation')

const CHAT = '11111111-1111-4111-8111-111111111111'
const MEDIA_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/

const settings = {
  providers: { openaiApiKey: 'sk-test' },
  image: { model: 'gpt-image-2', size: '1024x1536' }
} as unknown as Settings

function png(width = 3, height = 2): Buffer {
  const b = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0)
  b.writeUInt32BE(13, 8)
  b.write('IHDR', 12, 'ascii')
  b.writeUInt32BE(width, 16)
  b.writeUInt32BE(height, 20)
  return b
}

const chatDir = join(home, 'media', CHAT)
const fetchMock = vi.fn()

afterEach(() => {
  generate.mockReset()
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function textOf(out: { content: Array<{ type: string; text?: string }> }) {
  const block = out.content[0]
  return block?.type === 'text' ? (block.text ?? '') : ''
}

const run = (
  target: { chatId: string } | { groupId: string } = { chatId: CHAT }
) => imageGeneration(settings, target).execute('c1', { prompt: 'a fox' })

describe('image_generation', () => {
  it('writes a base64 result to ~/.exodus/media/<chatId> and puts only its id in details', async () => {
    const bytes = png(3, 2)
    generate.mockResolvedValue({
      output_format: 'png',
      data: [
        {
          b64_json: bytes.toString('base64'),
          revised_prompt: 'a red fox, watercolour'
        }
      ]
    })
    const out = await run()

    const [image] = out.details.images
    expect(image).toEqual({
      mediaId: expect.stringMatching(MEDIA_ID),
      chatId: CHAT,
      mimeType: 'image/png',
      width: 3,
      height: 2,
      revisedPrompt: 'a red fox, watercolour'
    })
    expect(out.details.size).toBe('1024x1536')
    expect(readFileSync(join(chatDir, image.mediaId!))).toEqual(bytes)
    // No bytes anywhere in what gets stored or sent.
    expect(JSON.stringify(out.details)).not.toContain(bytes.toString('base64'))
    expect(JSON.stringify(out.details)).not.toContain('data:')
    const text = textOf(out)
    expect(text).not.toContain(bytes.toString('base64'))
    expect(JSON.parse(text)).toEqual({
      shownToUser: 1,
      images: [{ revisedPrompt: 'a red fox, watercolour' }]
    })
  })

  it('downloads a URL result right away and saves it, typed by its bytes', async () => {
    const bytes = png(8, 8)
    fetchMock.mockResolvedValue(
      new Response(bytes, { headers: { 'content-type': 'image/png' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    generate.mockResolvedValue({
      data: [{ url: 'https://img.example/1.png' }]
    })
    const out = await run()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://img.example/1.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
    const [image] = out.details.images
    expect(image).toMatchObject({
      mediaId: expect.stringMatching(MEDIA_ID),
      chatId: CHAT,
      mimeType: 'image/png',
      width: 8,
      height: 8
    })
    expect(image).not.toHaveProperty('url')
    expect(readFileSync(join(chatDir, image.mediaId!))).toEqual(bytes)
    // The model text is what it was: the count, and the link while it lives.
    expect(JSON.parse(textOf(out))).toEqual({
      shownToUser: 1,
      images: [{ url: 'https://img.example/1.png' }]
    })
  })

  it('turns a failed download into a tool error, and leaves no files behind', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(png(), { status: 200 }))
      .mockResolvedValueOnce(new Response('gone', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    generate.mockResolvedValue({
      data: [
        { url: 'https://img.example/1.png' },
        { url: 'https://img.example/2.png' }
      ]
    })
    const before = existsSync(chatDir) ? readdirSync(chatDir).length : 0

    await expect(run()).rejects.toThrow(/image 2 of 2.*403/i)
    expect(existsSync(chatDir) ? readdirSync(chatDir).length : 0).toBe(before)
  })

  it('turns a download that is not an image into a tool error', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>', { headers: { 'content-type': 'text/html' } })
    )
    vi.stubGlobal('fetch', fetchMock)
    generate.mockResolvedValue({ data: [{ url: 'https://img.example/1.png' }] })

    await expect(run()).rejects.toThrow(/not a png, jpeg or webp/i)
  })

  it('saves a Philharmonic result under media/_groups/<groupId>, with no chatId', async () => {
    generate.mockResolvedValue({
      data: [{ b64_json: png().toString('base64') }]
    })
    const out = await run({ groupId: 'group-1' })

    const [image] = out.details.images
    expect(image).not.toHaveProperty('chatId')
    expect(
      existsSync(join(home, 'media', '_groups', 'group-1', image.mediaId!))
    ).toBe(true)
  })
})
