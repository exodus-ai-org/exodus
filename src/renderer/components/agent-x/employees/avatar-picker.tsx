import { AVATAR_STYLES, randomAvatarSeed } from '@shared/constants/avatar'
import { RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { EmployeeAvatar } from './employee-avatar'

export function AvatarPicker({
  seed,
  style,
  onChange
}: {
  seed: string | null
  style: string | null
  onChange: (next: { avatarSeed: string; avatarStyle: string }) => void
}) {
  // Stabilize a fallback seed across renders. Without this, `seed ?? randomAvatarSeed()`
  // re-generates every render when the parent's seed is null, scrambling every tile.
  const [fallbackSeed] = useState(() => randomAvatarSeed())
  const currentSeed = seed ?? fallbackSeed
  const activeStyle = style ?? AVATAR_STYLES[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <EmployeeAvatar seed={currentSeed} style={activeStyle} size={64} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              avatarSeed: randomAvatarSeed(),
              avatarStyle: activeStyle
            })
          }
        >
          <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
          Reroll
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {AVATAR_STYLES.map((s) => {
          const selected = s === activeStyle
          return (
            <button
              key={s}
              type="button"
              onClick={() =>
                onChange({ avatarSeed: currentSeed, avatarStyle: s })
              }
              className={cn(
                'group bg-card flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors',
                'hover:bg-accent/40',
                selected
                  ? 'border-primary ring-primary/40 ring-2'
                  : 'border-border'
              )}
            >
              <EmployeeAvatar seed={currentSeed} style={s} size={48} />
              <span
                className={cn(
                  'text-xs capitalize',
                  selected
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
