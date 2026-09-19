import type { SchemeColors } from '@exodus/shared/constants/appearance'

import { cn } from '@/lib/utils'

/** The "Aa" tile: the scheme's background with its accent as the glyph colour. */
export function SchemeSwatch({
  colors,
  size = 'md',
  className
}: {
  colors: SchemeColors
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold ring-1 ring-black/10 select-none',
        size === 'sm' ? 'size-6 text-[11px]' : 'size-8 text-sm',
        className
      )}
      style={{ backgroundColor: colors.background, color: colors.accent }}
    >
      Aa
    </span>
  )
}
