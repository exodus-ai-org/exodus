import type { Message } from '@earendil-works/pi-ai'

const DATA_URL = /^data:([^;,]+)(?:;[^,]*)?;base64,/

/**
 * An image's payload as pi wants it: bare base64. The renderer keeps an
 * attachment as a data URL (`data:image/png;base64,…`) because that is what
 * an `<img>` shows, and a chat saves it that way — pi hands `data` to the
 * provider as it is, so Anthropic answered 400 "invalid base64 data" and
 * OpenAI got the prefix twice. The data URL's own type wins over the one
 * stored beside it.
 */
export function bareImageData(
  data: string,
  mimeType: string
): { data: string; mimeType: string } {
  const match = DATA_URL.exec(data)
  if (!match) return { data, mimeType }
  return { data: data.slice(match[0].length), mimeType: match[1] }
}

/** The message with every image part's data bare; the same object if none needed it. */
export function withBareImages(message: Message): Message {
  if (message.role === 'assistant' || typeof message.content === 'string') {
    return message
  }
  let changed = false
  const content = message.content.map((part) => {
    if (part.type !== 'image' || !DATA_URL.test(part.data)) return part
    changed = true
    return { ...part, ...bareImageData(part.data, part.mimeType) }
  })
  return changed ? ({ ...message, content } as Message) : message
}
