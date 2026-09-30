import type { Message } from '@earendil-works/pi-ai'
import { bareImageData, withBareImages } from '@main/lib/ai/utils/image-data'
import { describe, expect, it } from 'vitest'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk'

describe('bareImageData', () => {
  it('takes the payload and type out of a data URL', () => {
    expect(bareImageData(`data:image/png;base64,${PNG}`, 'image/jpeg')).toEqual(
      { data: PNG, mimeType: 'image/png' }
    )
  })

  it('leaves bare base64 as it is', () => {
    expect(bareImageData(PNG, 'image/png')).toEqual({
      data: PNG,
      mimeType: 'image/png'
    })
  })
})

describe('withBareImages', () => {
  it('strips the data URL prefix from a user message the renderer saved', () => {
    const message = {
      role: 'user',
      content: [
        { type: 'text', text: 'what is this?' },
        {
          type: 'image',
          data: `data:image/webp;base64,${PNG}`,
          mimeType: 'image/webp'
        }
      ],
      timestamp: 1
    } as Message
    const out = withBareImages(message)
    expect(out.content).toEqual([
      { type: 'text', text: 'what is this?' },
      { type: 'image', data: PNG, mimeType: 'image/webp' }
    ])
  })

  it('keeps the same object when there is nothing to strip', () => {
    const message = {
      role: 'user',
      content: [{ type: 'image', data: PNG, mimeType: 'image/png' }],
      timestamp: 1
    } as Message
    expect(withBareImages(message)).toBe(message)
    const text = { role: 'user', content: 'hi', timestamp: 1 } as Message
    expect(withBareImages(text)).toBe(text)
  })

  it('strips a tool result image too', () => {
    const message = {
      role: 'toolResult',
      toolCallId: 'c',
      toolName: 't',
      isError: false,
      content: [
        {
          type: 'image',
          data: `data:image/png;base64,${PNG}`,
          mimeType: 'image/png'
        }
      ],
      timestamp: 1
    } as Message
    expect(withBareImages(message).content).toEqual([
      { type: 'image', data: PNG, mimeType: 'image/png' }
    ])
  })
})
