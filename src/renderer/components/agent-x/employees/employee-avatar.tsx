import * as collection from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import { DEFAULT_AVATAR_STYLE } from '@shared/constants/avatar'
import { useMemo } from 'react'

import { cn } from '@/lib/utils'

export function EmployeeAvatar({
  seed,
  style,
  size = 36,
  className
}: {
  seed: string | null
  style: string | null
  size?: number
  className?: string
}) {
  const uri = useMemo(() => {
    const styleKey = (style ?? DEFAULT_AVATAR_STYLE) as keyof typeof collection
    const factory =
      collection[styleKey] ??
      collection[DEFAULT_AVATAR_STYLE as keyof typeof collection]
    return createAvatar(factory as never, {
      seed: seed ?? 'default'
    }).toDataUri()
  }, [seed, style])

  return (
    <img
      src={uri}
      width={size}
      height={size}
      className={cn('bg-muted rounded-full', className)}
      alt="avatar"
    />
  )
}
