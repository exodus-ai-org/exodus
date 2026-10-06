import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Toaster } from 'sileo'

import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

/**
 * The toast is an inverted card — foreground on background, the way a
 * tooltip is — so it reads over any page. sileo paints it as an SVG
 * `fill`, which cannot take `var(--foreground)`, so the token is read from
 * the document and handed over as a colour; it is re-read when the theme or
 * the colour tone changes, so a tinted tone tints the toast too.
 */
function useTokenColor(name: string, deps: unknown[]): string | undefined {
  const [color, setColor] = useState<string>()
  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim()
    setColor(value || undefined)
    // The token's value is what changed, not the deps themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return color
}

export function AppToaster() {
  const { resolvedTheme } = useTheme()
  const { data: settings } = useSettings()
  const fill = useTokenColor('--foreground', [
    resolvedTheme,
    settings?.colorTone
  ])

  return (
    <Toaster
      options={{
        position: 'bottom-right',
        fill,
        autopilot: {
          expand: 500,
          collapse: 3000
        },
        styles: {
          // On the inverted card the body text is the page background at
          // 80%: legible on the foreground fill in both modes and any tone.
          description: cn('text-background/80!', 'text-xs!', 'break-all')
        }
      }}
    />
  )
}
