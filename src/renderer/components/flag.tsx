import { Globe } from 'lucide-react'

import { cn } from '@/lib/utils'

// One small SVG file per country, referenced by URL — not React components and
// not inlined: the web-search country list alone is 239 flags, which as inline
// SVG (or base64 data URIs, Vite's default under 4 KB) would put well over a
// megabyte into the settings chunk. As files, only the flags actually on
// screen are ever read from disk. SVG rather than emoji because Windows ships
// no flag emoji at all — it renders the two letters instead.
const FLAG_URLS = import.meta.glob<string>(
  '/node_modules/country-flag-icons/3x2/*.svg',
  { eager: true, query: '?no-inline', import: 'default' }
)

// Codes that search providers use but ISO 3166-1 does not.
const ALIASES: Record<string, string> = { UK: 'GB' }

function flagUrl(code: string): string | undefined {
  const upper = code.toUpperCase()
  const iso = ALIASES[upper] ?? upper
  return FLAG_URLS[`/node_modules/country-flag-icons/3x2/${iso}.svg`]
}

/**
 * A country's flag by ISO 3166-1 alpha-2 code (case-insensitive). Decorative —
 * it always sits next to the country's or language's name. A code with no flag
 * (dissolved states such as AN or CS) gets a neutral globe of the same size.
 */
export function Flag({
  code,
  className
}: {
  code: string
  className?: string
}) {
  const url = flagUrl(code)
  if (!url) {
    return (
      <Globe
        aria-hidden
        className={cn('text-muted-foreground size-4 shrink-0', className)}
      />
    )
  }
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      draggable={false}
      // The hairline ring keeps mostly-white flags (Japan, Korea) from
      // dissolving into a white surface.
      className={cn(
        'h-3 w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 dark:ring-white/15',
        className
      )}
    />
  )
}
