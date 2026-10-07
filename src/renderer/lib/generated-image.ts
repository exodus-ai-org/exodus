import { BASE_URL } from '@exodus/shared/constants/systems'
import type {
  GeneratedImage,
  LegacyGeneratedImage
} from '@exodus/shared/types/chat'

import { isRasterDataUrl } from '@/components/markdown/remote-image'

/**
 * Where a generated image loads from: a saved image from the local media
 * route; a row written before images were saved (a base64 `data:` URL, or a
 * DALL·E link — dead an hour after it was made, which the card's `onError`
 * turns into "unavailable") from its `url`. A `data:` URL only when it is a
 * raster image — the same rule as the chat's remote images: an SVG rendered
 * as `<img>` still fetches its own `<image href>` / `url()` references.
 * Anything else has nothing to show.
 */
export function imageSrcOf(
  image: Partial<GeneratedImage> & LegacyGeneratedImage
): string | undefined {
  if (image.mediaId) {
    return image.chatId
      ? `${BASE_URL}/api/v1/media/${encodeURIComponent(image.chatId)}/${encodeURIComponent(image.mediaId)}`
      : undefined
  }
  const url = image.url
  if (!url) return undefined
  if (/^data:/iu.test(url)) return isRasterDataUrl(url) ? url : undefined
  return /^https?:/iu.test(url) ? url : undefined
}
