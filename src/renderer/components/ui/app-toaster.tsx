import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { Toaster } from 'sileo'

export function AppToaster() {
  const { actualTheme } = useTheme()

  return (
    <Toaster
      options={{
        position: 'bottom-right',
        fill: actualTheme === 'dark' ? '#f2f2f2' : '#1a1a1a',
        autopilot: {
          expand: 500,
          collapse: 3000
        },
        styles: {
          description: cn(
            actualTheme === 'dark' ? 'text-black/80!' : 'text-white/80!',
            'text-xs!',
            'break-all'
          )
        }
      }}
    />
  )
}
