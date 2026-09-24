import { BASE_URL } from '@exodus/shared/constants/systems'
import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import type { WebSearchResult } from '@exodus/shared/types/web-search'
import { ImageIcon } from 'lucide-react'
import { createContext, useContext, useReducer } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

/**
 * `markdown.tsx`'s `img` override. A remote `src` in model output can be a
 * tracking pixel or carry data out through its query string (prompt
 * injection), so it loads only when the user asks for it — see
 * docs/security-hardening.md, "Remote images in chat". exodus-ios applies the
 * same rule (`MarkdownImagePolicy.tapToLoadRemote`).
 *
 * What loads without a tap: a `data:` URL, the app's own media route
 * (loopback only), and an `https:` image whose host is one of the run's own
 * web-search results — already trusted enough to be cited. Everything else
 * — including any `http:` (non-TLS) remote image, even from a search-result
 * host — shows a compact placeholder instead.
 */

const MEDIA_ROUTE_PREFIX = `${BASE_URL}/api/v1/media/`

// Provided by `Markdown` from the run's `webSearchResults` prop, in its own
// context rather than through the ReactMarkdown `components` map: threading
// it through `components` would give that object a new identity whenever
// search results streamed in, which would invalidate every memoized block in
// the document (see markdown-citations.tsx's `WebSearchRankMapContext`,
// which exists for the same reason).
export const AllowedImageHostsContext =
  createContext<ReadonlySet<string> | null>(null)

function hostnameOf(src: string): string | null {
  try {
    return new URL(src).hostname
  } catch {
    return null
  }
}

/** The hosts a run's own web search already surfaced — safe to auto-load. */
export function allowedImageHosts(
  webSearchResults: WebSearchResult[] | undefined
): ReadonlySet<string> | null {
  if (!webSearchResults || webSearchResults.length === 0) return null
  const hosts = new Set<string>()
  for (const result of webSearchResults) {
    const host = result.hostname || hostnameOf(result.link)
    if (host) hosts.add(host)
  }
  return hosts.size > 0 ? hosts : null
}

/** A `data:` URL, the app's own media route, or an `https:` image from one
 *  of `allowedHosts` — loads without asking. */
export function loadsAutomatically(
  src: string,
  allowedHosts: ReadonlySet<string> | null
): boolean {
  if (src.startsWith('data:')) return true
  if (src.startsWith(MEDIA_ROUTE_PREFIX)) return true
  if (!allowedHosts) return false
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }
  return url.protocol === 'https:' && allowedHosts.has(url.hostname)
}

// Every `src` the user has chosen to load, for the life of the renderer
// process. A module-level Set, not React state: a placeholder can unmount
// (a re-parsed streaming block, leaving the chat and coming back) and remount
// without asking again — "loaded" is a fact about the URL, not about one
// component instance.
const loadedRemoteImages = new Set<string>()

export function RemoteImage({
  src,
  alt,
  className,
  ...rest
}: {
  src?: string
  alt?: string
  className?: string
  [key: string]: unknown
}) {
  const { t } = useTranslation('chat')
  const allowedHosts = useContext(AllowedImageHostsContext)
  // Only used to force a re-render after a click; `loaded` itself is always
  // read fresh from the module-level Set below, never cached in state — the
  // same `src` position can carry a different URL frame to frame while a
  // reply streams.
  const [, forceRerender] = useReducer((n: number) => n + 1, 0)

  const loaded =
    src !== undefined &&
    (loadsAutomatically(src, allowedHosts) || loadedRemoteImages.has(src))

  if (!src || loaded) {
    return (
      <img
        {...rest}
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        className={cn('mb-3', className)}
      />
    )
  }

  const host = hostnameOf(src) ?? src

  return (
    <span
      data-testid={TEST_IDS.chat.remoteImage.placeholder}
      className="border-border/50 bg-background/70 text-muted-foreground mb-3 flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm backdrop-blur-md"
    >
      <ImageIcon className="size-3.5 shrink-0" aria-hidden />
      <span className="text-foreground min-w-0 truncate font-medium">
        {host}
      </span>
      {alt && <span className="min-w-0 flex-1 truncate">{alt}</span>}
      <button
        type="button"
        data-testid={TEST_IDS.chat.remoteImage.loadButton}
        onClick={() => {
          loadedRemoteImages.add(src)
          forceRerender()
        }}
        className="text-primary shrink-0 hover:underline"
      >
        {t('remoteImage.loadButton')}
      </button>
    </span>
  )
}
