import { AVATAR_STYLES, randomAvatarSeed } from '@shared/constants/avatar'
import { RefreshCwIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange({
              avatarSeed: randomAvatarSeed(),
              avatarStyle: activeStyle
            })
          }
        >
          <RefreshCwIcon className="h-3.5 w-3.5" />
          Reroll
        </Button>
      </div>
      <ToggleGroup
        value={[activeStyle]}
        onValueChange={(v) => {
          const next = v[0]
          if (!next) return
          onChange({ avatarSeed: currentSeed, avatarStyle: next })
        }}
        variant="outline"
        spacing={8}
        className="w-full"
      >
        {AVATAR_STYLES.map((s) => (
          <ToggleGroupItem
            key={s}
            value={s}
            className="h-auto flex-1 flex-col gap-1 px-2 py-2"
          >
            <EmployeeAvatar seed={currentSeed} style={s} size={48} />
            <span className="text-xs capitalize">{s}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
