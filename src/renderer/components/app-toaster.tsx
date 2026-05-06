import { Toaster } from 'sileo'

import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function AppToaster() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Toaster
      options={{
        position: 'bottom-right',
        fill: isDark ? '#f2f2f2' : '#1a1a1a',
        autopilot: {
          expand: 500,
          collapse: 3000
        },
        styles: {
          description: cn(
            isDark ? 'text-black/80!' : 'text-white/80!',
            'text-xs!',
            'break-all'
          )
        }
      }}
    />
  )
}
