import * as collection from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { DEFAULT_AVATAR_STYLE } from '@shared/constants/avatar'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

import { hueStyle, pickHue, type HueName } from '../lib/hue'

export function EmployeeAvatar({
  seed,
  style,
  size = 36,
  hue,
  ring = true,
  className
}: {
  seed: string | null
  style: string | null
  size?: number
  hue?: HueName
  ring?: boolean
  className?: string
}) {
  const dataUri = useMemo(() => {
    const styleKey = (style ?? DEFAULT_AVATAR_STYLE) as keyof typeof collection
    const factory =
      collection[styleKey] ??
      collection[DEFAULT_AVATAR_STYLE as keyof typeof collection]
    return createAvatar(factory as never, {
      seed: seed ?? 'default'
    }).toDataUri()
  }, [seed, style])

  const resolvedHue = hue ?? pickHue(seed ?? 'default')
  const wrapperStyle = ring ? hueStyle(resolvedHue) : undefined

  return (
    <div
      className={cn('relative inline-flex shrink-0 rounded-full', className)}
      style={{ width: size, height: size, ...wrapperStyle }}
    >
      <img
        src={dataUri}
        width={size}
        height={size}
        className="rounded-full"
        alt="avatar"
      />
    </div>
  )
}
