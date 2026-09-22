import type { Message } from '@earendil-works/pi-ai'
import { transformMessages } from '@main/lib/ai/utils/transform-messages'
import { describe, expect, it } from 'vitest'

const RAW_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('transformMessages — image content normalization', () => {
  it('strips a data:<mime>;base64, prefix from a user image block', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'look at this' },
          {
            type: 'image',
            data: `data:image/png;base64,${RAW_B64}`,
            mimeType: 'image/png'
          }
        ]
      } as unknown as Message
    ]

    const [out] = transformMessages(messages) as unknown as [
      { content: Array<{ type: string; data?: string }> }
    ]
    const image = out.content.find((b) => b.type === 'image')
    expect(image?.data).toBe(RAW_B64)
  })

  it('leaves already-raw base64 untouched (no double-strip)', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [{ type: 'image', data: RAW_B64, mimeType: 'image/png' }]
      } as unknown as Message
    ]

    const [out] = transformMessages(messages) as unknown as [
      { content: Array<{ type: string; data?: string }> }
    ]
    expect(out.content[0].data).toBe(RAW_B64)
  })

  it('returns the same message reference when nothing changed', () => {
    const msg = {
      role: 'user',
      content: [{ type: 'text', text: 'hi' }]
    } as unknown as Message

    const [out] = transformMessages([msg])
    expect(out).toBe(msg)
  })

  it('handles a plain string user content without throwing', () => {
    const msg = { role: 'user', content: 'just text' } as unknown as Message
    const [out] = transformMessages([msg]) as unknown as [{ content: string }]
    expect(out.content).toBe('just text')
  })

  it('normalizes several image data URLs (jpeg, webp) in one turn', () => {
    const messages: Message[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            data: `data:image/jpeg;base64,${RAW_B64}`,
            mimeType: 'image/jpeg'
          },
          {
            type: 'image',
            data: `data:image/webp;base64,${RAW_B64}`,
            mimeType: 'image/webp'
          }
        ]
      } as unknown as Message
    ]

    const [out] = transformMessages(messages) as unknown as [
      { content: Array<{ type: string; data?: string }> }
    ]
    expect(out.content.map((b) => b.data)).toEqual([RAW_B64, RAW_B64])
  })
})
