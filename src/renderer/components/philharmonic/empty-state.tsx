import { type ReactNode } from 'react'

import type { HueName } from './lib/hue'

interface AvatarSpec {
  hue: HueName
  content?: ReactNode
}

interface Props {
  avatars: AvatarSpec[]
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

const SMALL = 48
const LARGE = 56

export function PhilharmonicEmptyState({
  avatars,
  title,
  description,
  action
}: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex">
        {avatars.map((a, i) => {
          const size = i === 1 ? LARGE : SMALL
          const isCenter = i === 1
          const offset = i === 0 ? 6 : i === 2 ? -6 : 0
          return (
            <div
              key={i}
              className={i === 0 ? '' : '-ml-2'}
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `var(--ph-hue-${a.hue}-fill)`,
                boxShadow: `inset 0 0 0 1.5px var(--ph-hue-${a.hue}-ring), 0 0 0 3px var(--ph-surface)`,
                transform:
                  i === 0
                    ? `rotate(-8deg) translateX(${offset}px)`
                    : i === 2
                      ? `rotate(8deg) translateX(${offset}px)`
                      : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                zIndex: isCenter ? 1 : 0
              }}
            >
              {a.content}
            </div>
          )
        })}
      </div>
      <div className="text-sm font-semibold text-[var(--ph-text)]">{title}</div>
      {description && (
        <div className="mt-1 max-w-[280px] text-[12.5px] text-[var(--ph-text-muted)]">
          {description}
        </div>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 h-9 rounded-[var(--ph-radius-md)] px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--ph-primary)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
