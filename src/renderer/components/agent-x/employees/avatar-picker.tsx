import { AVATAR_STYLES, randomAvatarSeed } from '@shared/constants/avatar'

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
  const currentSeed = seed ?? randomAvatarSeed()
  return (
    <div className="flex items-center gap-3">
      <EmployeeAvatar seed={currentSeed} style={style} size={48} />
      <div className="flex flex-wrap gap-1">
        {AVATAR_STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() =>
              onChange({ avatarSeed: currentSeed, avatarStyle: s })
            }
            className={cn(
              'rounded-md border p-0.5',
              s === (style ?? '') && 'ring-primary ring-2'
            )}
          >
            <EmployeeAvatar seed={currentSeed} style={s} size={32} />
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            avatarSeed: randomAvatarSeed(),
            avatarStyle: style ?? AVATAR_STYLES[0]
          })
        }
      >
        Reroll
      </Button>
    </div>
  )
}
